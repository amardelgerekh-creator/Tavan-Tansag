import { createHmac } from "node:crypto";
import { categoryIds } from "../catalog";
import { communityConsentVersion, communityInputSchema, communityKeySchema, communityRecordSchema, type PersistCommunity } from "../community-contract";
import { documentWrite, PrivateStoreError, type FirestoreGateway, type DocumentData } from "./firestore-protocol";
import { notificationForCommunity, notificationPath } from "./notification-contract";

const WINDOW_MS = 15 * 60 * 1000;
function countInWindow(data: DocumentData | undefined, now: number) {
  if (!data) return 0;
  if (typeof data.startedAt !== "number" || !Number.isSafeInteger(data.startedAt) || typeof data.count !== "number" || !Number.isSafeInteger(data.count) || data.count < 0) throw new PrivateStoreError();
  return now - data.startedAt >= WINDOW_MS ? 0 : data.count;
}

/** Durable email deduplication. Anonymous callers never replace another person's preferences or withdrawal. */
export function createCommunityPersistence(options: { store: FirestoreGateway; hashSecret: string; notificationsEnabled?: boolean; now?: () => number }): PersistCommunity {
  const { store } = options;
  const hmac = (kind: string, value: string) => createHmac("sha256", options.hashSecret).update(`community:${kind}\0${value}`).digest("hex");
  return async (raw, key, context) => {
    if (options.hashSecret.length < 32) return { ok: false, code: "UNAVAILABLE" };
    const parsed = communityInputSchema.safeParse(raw);
    if (!parsed.success || !communityKeySchema.safeParse(key).success) return { ok: false, code: "UNAVAILABLE" };
    const input = parsed.data;
    const interests = categoryIds.filter(category => input.interests.includes(category));
    const payload = { email: input.email, firstName: input.firstName, lastName: input.lastName || null, interests, locale: input.locale, consent: true, consentVersion: communityConsentVersion };
    const fingerprint = hmac("payload", JSON.stringify(payload));
    const id = `CM-${hmac("email", input.email)}`;
    const path = `community_requests/${id}`;
    const keyPath = `community_keys/${hmac("key", key)}`;
    const emailLimitPath = `community_limits/${hmac("email-limit", input.email)}`;
    const ipLimitPath = `community_limits/${hmac("ip-limit", context?.clientIp || "unidentified")}`;
    const now = options.now?.() ?? Date.now(); const at = new Date(now).toISOString();
    for (let attempt = 0; attempt < 4; attempt++) {
      let transaction: string | undefined; let committed = false;
      try {
        transaction = await store.begin();
        const rows = await store.readMany([path, keyPath, emailLimitPath, ipLimitPath], transaction);
        const current = rows.get(path)?.data;
        if (current) {
          const decoded = communityRecordSchema.safeParse(current);
          if (!decoded.success || decoded.data.id !== id || decoded.data.email !== input.email) throw new PrivateStoreError();
        }
        const replay = rows.get(keyPath)?.data;
        if (replay) {
          if (replay.fingerprint !== fingerprint) return { ok: false, code: "IDEMPOTENCY_CONFLICT" };
          if (!current || replay.requestId !== id) throw new PrivateStoreError();
          return { ok: true };
        }
        const emailLimit = rows.get(emailLimitPath)?.data, ipLimit = rows.get(ipLimitPath)?.data;
        const emailCount = countInWindow(emailLimit, now), ipCount = countInWindow(ipLimit, now);
        if (emailCount >= 3 || ipCount >= 10) return { ok: false, code: "RATE_LIMITED" };
        const counter = (data: DocumentData | undefined, count: number) => ({ startedAt: count === 0 ? now : data!.startedAt, count: count + 1, updatedAt: at });
        const notification = !current && options.notificationsEnabled ? notificationForCommunity(id, input.locale, now) : null;
        const writes = [
          documentWrite(store, keyPath, { fingerprint, requestId: id, createdAt: at }, { exists: false }),
          documentWrite(store, emailLimitPath, counter(emailLimit, emailCount)),
          documentWrite(store, ipLimitPath, counter(ipLimit, ipCount)),
          ...(!current ? [
            documentWrite(store, path, { ...payload, id, emailVerified: false, consentAt: at, status: "requested", revision: 0, createdAt: at, updatedAt: at }, { exists: false }),
            documentWrite(store, `${path}/activity/created`, { kind: "created", actor: "website", at, status: "requested", revision: 0, consentVersion: communityConsentVersion }, { exists: false }),
          ] : []),
          ...(notification ? [documentWrite(store, notificationPath(notification.id), notification, { exists: false })] : []),
        ];
        await store.commit(writes, transaction); committed = true;
        return { ok: true, ...(notification ? { notificationId: notification.id } : {}) };
      } catch (error) {
        if (!(error instanceof PrivateStoreError) || error.code !== "ABORTED" || attempt === 3) return { ok: false, code: "UNAVAILABLE" };
      } finally { if (transaction && !committed) await store.rollback(transaction).catch(() => undefined); }
    }
    return { ok: false, code: "UNAVAILABLE" };
  };
}
