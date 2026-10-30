import { createHmac, randomBytes } from "node:crypto";
import { inquirySchema, idempotencyKeySchema, normalizeContact, type PersistInquiry } from "./inquiry-contract";
import { documentWrite, PrivateStoreError, type FirestoreGateway, type DocumentData } from "./firestore-protocol";
import { notificationForInquiry, notificationPath } from "./notification-contract";

const WINDOW_MS = 15 * 60 * 1000;
const RETRIES = 4;

function countInWindow(record: DocumentData | null | undefined, now: number): number {
  if (!record) return 0;
  if (typeof record.startedAt !== "number" || typeof record.count !== "number" || !Number.isSafeInteger(record.count) || record.count < 0) throw new PrivateStoreError();
  return now - record.startedAt >= WINDOW_MS ? 0 : record.count;
}

/** Injectable transaction engine. Tests use an atomic in-memory store, not live customer data. */
export function createInquiryPersistence(options: {
  store: FirestoreGateway;
  hashSecret: string;
  assignee: string;
  includeSamples: boolean;
  notificationsEnabled?: boolean;
  now?: () => number;
  reference?: () => string;
}): PersistInquiry {
  const { store } = options;
  const hmac = (kind: string, value: string) => createHmac("sha256", options.hashSecret).update(kind + "\0" + value).digest("hex");
  return async (rawInput, key, context) => {
    if (options.hashSecret.length < 32 || !options.assignee) return { ok: false, code: "UNAVAILABLE" };
    const parsed = inquirySchema.safeParse(rawInput);
    if (!parsed.success || !idempotencyKeySchema.safeParse(key).success) return { ok: false, code: "UNAVAILABLE" };
    const input = parsed.data;
    const contactValue = normalizeContact(input);
    const fingerprint = hmac("payload", JSON.stringify({
      name: input.name, contactMethod: input.contactMethod, contactValue,
      message: input.message, locale: input.locale, productId: input.productId ?? null,
      ...(input.purpose && input.purpose !== "general" ? { purpose: input.purpose } : {}),
    }));
    const keyPath = `inquiry_keys/${hmac("key", key)}`;
    const contactPath = `inquiry_limits/${hmac("contact", input.contactMethod + ":" + contactValue)}`;
    const ipPath = `inquiry_limits/${hmac("ip", context?.clientIp || "unidentified")}`;
    const productPath = input.productId ? `catalog_public/${input.productId}` : null;
    const paths = [keyPath, contactPath, ipPath, ...(productPath ? [productPath] : [])];
    const reference = options.reference?.() ?? `TT-${randomBytes(10).toString("hex").toUpperCase()}`;
    const now = options.now?.() ?? Date.now();
    const timestamp = new Date(now).toISOString();

    for (let attempt = 0; attempt < RETRIES; attempt++) {
      let transaction: string | undefined;
      let committed = false;
      try {
        transaction = await store.begin();
        const documents = await store.readMany(paths, transaction);
        const existing = documents.get(keyPath)?.data;
        if (existing) {
          if (existing.fingerprint !== fingerprint) return { ok: false, code: "IDEMPOTENCY_CONFLICT" };
          if (typeof existing.reference !== "string" || !/^TT-[A-F0-9]{20}$/.test(existing.reference)) throw new PrivateStoreError();
          return { ok: true, reference: existing.reference, duplicate: true };
        }
        const product = productPath ? documents.get(productPath)?.data : null;
        if (productPath && (!product || product.visibility !== "public" || !(
          (product.publicationStatus === "published" && product.verificationStatus === "verified") ||
          (options.includeSamples && product.publicationStatus === "sample" && product.verificationStatus === "needs_review")
        ))) return { ok: false, code: "UNKNOWN_PRODUCT" };

        const contactLimit = documents.get(contactPath)?.data;
        const ipLimit = documents.get(ipPath)?.data;
        const contactCount = countInWindow(contactLimit, now);
        const ipCount = countInWindow(ipLimit, now);
        if (contactCount >= 3 || ipCount >= 10) return { ok: false, code: "RATE_LIMITED" };
        let productName: { mn: string; en: string } | null = null;
        if (product) {
          const name = product.name as Record<string, unknown> | undefined;
          if (!name || typeof name.mn !== "string" || typeof name.en !== "string") throw new PrivateStoreError();
          productName = { mn: name.mn, en: name.en };
        }
        const counter = (data: DocumentData | undefined, count: number) => ({
          startedAt: count === 0 ? now : data!.startedAt,
          count: count + 1,
          updatedAt: timestamp,
        });
        const notification = options.notificationsEnabled ? notificationForInquiry(reference, input.productId ?? null, input.locale, now) : null;
        const writes = [
          documentWrite(store, `inquiries/${reference}`, {
            reference, name: input.name, contactMethod: input.contactMethod, contactValue,
            message: input.message, locale: input.locale, purpose: input.purpose ?? "general", productId: input.productId ?? null, productName,
            status: "new", assignee: options.assignee, followUpAt: null, notes: "", revision: 0,
            createdAt: timestamp, updatedAt: timestamp,
          }, { exists: false }),
          documentWrite(store, keyPath, { fingerprint, reference, createdAt: timestamp }, { exists: false }),
          documentWrite(store, contactPath, counter(contactLimit, contactCount)),
          documentWrite(store, ipPath, counter(ipLimit, ipCount)),
          documentWrite(store, `inquiries/${reference}/activity/created`, {
            kind: "created", actor: "website", at: timestamp, status: "new", assignee: options.assignee, revision: 0,
          }, { exists: false }),
          ...(notification ? [documentWrite(store, notificationPath(notification.id), notification, { exists: false })] : []),
        ];
        await store.commit(writes, transaction);
        committed = true;
        return { ok: true, reference, duplicate: false, ...(notification ? { notificationId: notification.id } : {}) };
      } catch (error) {
        if (!(error instanceof PrivateStoreError) || error.code !== "ABORTED" || attempt === RETRIES - 1) {
          return { ok: false, code: "UNAVAILABLE" };
        }
      } finally {
        if (transaction && !committed) await store.rollback(transaction).catch(() => undefined);
      }
    }
    return { ok: false, code: "UNAVAILABLE" };
  };
}
