import { randomUUID } from "node:crypto";
import { documentWrite, PrivateStoreError, type FirestoreGateway } from "./firestore-protocol";
import { isCustomerReceipt, notificationEnvelope, notificationFromSchema, notificationIdSchema, notificationPath, notificationRecordSchema, type NotificationRecord, type NotificationResult } from "./notification-contract";

const LEASE_MS = 60_000;
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 12;
const TRANSACTION_ATTEMPTS = 4;
export type NotificationConfig = { apiKey: string; from: string };
export function validNotificationConfig(value: NotificationConfig | null): value is NotificationConfig {
  return Boolean(value && /^re_[A-Za-z0-9_-]{10,}$/.test(value.apiKey) && notificationFromSchema.safeParse(value.from).success);
}
type Delivery = { status: "accepted"; providerId: string } | { status: "failed" | "review"; error: NonNullable<NotificationRecord["lastError"]> };
const retry = (seconds = 60): NotificationResult => ({ status: "retry", retryAfterSeconds: Math.max(1, Math.ceil(seconds)) });

export function createNotificationProcessor(options: { store: FirestoreGateway; config: () => NotificationConfig | null; fetcher?: typeof fetch; now?: () => number; leaseToken?: () => string }) {
  const { store } = options;
  const now = options.now ?? Date.now;
  const fetcher = options.fetcher ?? fetch;

  async function claim(id: string, config: NotificationConfig): Promise<NotificationRecord | NotificationResult> {
    const path = notificationPath(id);
    for (let attempt = 0; attempt < TRANSACTION_ATTEMPTS; attempt++) {
      let tx: string | undefined; let committed = false;
      try {
        tx = await store.begin();
        const document = (await store.readMany([path], tx)).get(path);
        if (!document) return { status: "done" };
        const parsed = notificationRecordSchema.safeParse(document.data);
        if (!parsed.success || parsed.data.id !== id) return { status: "review" };
        const row = parsed.data;
        if (row.envelope) {
          const expected = notificationEnvelope(row, row.envelope.from);
          if ((["from", "to", "subject", "text"] as const).some(field => row.envelope![field] !== expected[field])) return { status: "review" };
        }
        if (row.status === "accepted") return { status: "done" };
        if (row.status === "review") return { status: "review" };
        const clock = now();
        if (row.status === "sending" && row.leaseUntil && Date.parse(row.leaseUntil) > clock) return retry((Date.parse(row.leaseUntil) - clock) / 1000);
        if (row.firstAttemptAt && clock - Date.parse(row.firstAttemptAt) >= RETRY_WINDOW_MS || row.attemptCount >= MAX_ATTEMPTS) {
          const next: NotificationRecord = { ...row, status: "review", updatedAt: new Date(clock).toISOString(), nextAttemptAt: null, leaseToken: null, leaseUntil: null, lastError: row.attemptCount >= MAX_ATTEMPTS ? "attempt_limit" : "retry_window_expired" };
          await store.commit([documentWrite(store, path, next)], tx); committed = true;
          return { status: "review" };
        }
        if (row.nextAttemptAt && Date.parse(row.nextAttemptAt) > clock) return retry((Date.parse(row.nextAttemptAt) - clock) / 1000);
        const at = new Date(clock).toISOString();
        if (isCustomerReceipt(row.kind)) {
          // Exact document reads remain in the claim transaction; no customer collection is scanned.
          const inquiry = row.kind === "inquiry-receipt";
          const sourcePath = `${inquiry ? "inquiries" : "community_requests"}/${row.sourceId}`;
          const source = (await store.readMany([sourcePath], tx)).get(sourcePath)?.data;
          const matches = source && source.locale === row.locale && source.createdAt === row.createdAt && (inquiry
            ? source.reference === row.sourceId && source.productId === row.productId && source.contactMethod === "email" && source.contactValue === row.recipientEmail
            : source.id === row.sourceId && source.email === row.recipientEmail && source.consent === true && source.status !== "withdrawn");
          if (!matches) {
            const next: NotificationRecord = { ...row, status: "review", updatedAt: at, nextAttemptAt: null, leaseToken: null, leaseUntil: null, lastError: "source_mismatch" };
            await store.commit([documentWrite(store, path, next)], tx); committed = true;
            return { status: "review" };
          }
        }
        const leaseUntil = new Date(clock + LEASE_MS).toISOString();
        const next = notificationRecordSchema.parse({ ...row, status: "sending", updatedAt: at,
          attemptCount: row.attemptCount + 1, firstAttemptAt: row.firstAttemptAt ?? at,
          envelope: row.envelope ?? notificationEnvelope(row, config.from),
          leaseToken: options.leaseToken?.() ?? randomUUID(), leaseUntil, nextAttemptAt: leaseUntil,
        });
        await store.commit([documentWrite(store, path, next)], tx); committed = true;
        return next;
      } catch (error) {
        if (!(error instanceof PrivateStoreError) || error.code !== "ABORTED" || attempt === TRANSACTION_ATTEMPTS - 1) return retry();
      } finally { if (tx && !committed) await store.rollback(tx).catch(() => undefined); }
    }
    return retry();
  }

  async function deliver(row: NotificationRecord, config: NotificationConfig): Promise<Delivery> {
    try {
      const payload = row.envelope!;
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `tavan-new-request-v1/${row.id}` },
        body: JSON.stringify({ from: payload.from, to: [payload.to], subject: payload.subject, text: payload.text }),
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) {
        const body: unknown = await response.json();
        const providerId = typeof body === "object" && body !== null && "id" in body ? body.id : null;
        if (typeof providerId !== "string" || !/^[A-Za-z0-9_-]{1,120}$/.test(providerId)) return { status: "failed", error: "transport_uncertain" };
        return { status: "accepted", providerId };
      }
      if (response.status === 409) {
        let concurrent = false;
        try { const body = await response.json(); concurrent = body?.name === "concurrent_idempotent_requests"; } catch { /* Do not retain provider payloads. */ }
        return concurrent ? { status: "failed", error: "provider_retryable" } : { status: "review", error: "provider_conflict" };
      }
      if (response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500) return { status: "failed", error: "provider_retryable" };
      return { status: "review", error: "provider_rejected" };
    } catch { return { status: "failed", error: "transport_uncertain" }; }
  }

  async function finish(claimed: NotificationRecord, delivery: Delivery): Promise<NotificationResult> {
    const path = notificationPath(claimed.id);
    for (let attempt = 0; attempt < TRANSACTION_ATTEMPTS; attempt++) {
      let tx: string | undefined; let committed = false;
      try {
        tx = await store.begin();
        const document = (await store.readMany([path], tx)).get(path);
        if (!document) return { status: "done" };
        const parsed = notificationRecordSchema.safeParse(document.data);
        if (!parsed.success || parsed.data.id !== claimed.id) return { status: "review" };
        const current = parsed.data;
        if (current.status === "accepted") return { status: "done" };
        if (current.status === "review") return { status: "review" };
        if (current.leaseToken !== claimed.leaseToken || current.status !== "sending") return retry();
        const clock = now(), at = new Date(clock).toISOString();
        const delaySeconds = Math.min(3600, 30 * 2 ** Math.min(current.attemptCount - 1, 7));
        const expired = clock - Date.parse(current.firstAttemptAt!) >= RETRY_WINDOW_MS;
        const status = delivery.status === "accepted" ? "accepted" : delivery.status === "review" || expired || current.attemptCount >= MAX_ATTEMPTS ? "review" : "failed";
        const next: NotificationRecord = { ...current, status, updatedAt: at, leaseToken: null, leaseUntil: null,
          nextAttemptAt: status === "failed" ? new Date(clock + delaySeconds * 1000).toISOString() : null,
          providerId: delivery.status === "accepted" ? delivery.providerId : null,
          acceptedAt: delivery.status === "accepted" ? at : null,
          lastError: delivery.status === "accepted" ? null : expired ? "retry_window_expired" : current.attemptCount >= MAX_ATTEMPTS ? "attempt_limit" : delivery.error,
        };
        await store.commit([documentWrite(store, path, next)], tx); committed = true;
        return status === "failed" ? retry(delaySeconds) : { status };
      } catch (error) {
        if (!(error instanceof PrivateStoreError) || error.code !== "ABORTED" || attempt === TRANSACTION_ATTEMPTS - 1) return retry();
      } finally { if (tx && !committed) await store.rollback(tx).catch(() => undefined); }
    }
    return retry();
  }

  return async function processNotification(id: string): Promise<NotificationResult> {
    if (!notificationIdSchema.safeParse(id).success) return { status: "review" };
    let config: NotificationConfig | null;
    try { config = options.config(); } catch { return { status: "disabled" }; }
    if (!validNotificationConfig(config)) return { status: "disabled" };
    const claimed = await claim(id, config);
    if (!("id" in claimed)) return claimed;
    return finish(claimed, await deliver(claimed, config));
  };
}
