import assert from "node:assert/strict";
import test from "node:test";
import { notificationEnvelope, notificationForCommunity, notificationForInquiry, notificationPath, notificationRecipient, notificationRecordSchema, type NotificationRecord } from "../src/lib/server/notification-contract";
import { createNotificationProcessor, type NotificationConfig } from "../src/lib/server/notification-engine";
import { decodeFields, PrivateStoreError, type DocumentData, type FirestoreGateway } from "../src/lib/server/firestore-protocol";

const epoch = Date.parse("2026-10-30T12:00:00.000Z");
const reference = "TT-0123456789ABCDEF0123";
const config: NotificationConfig = { apiKey: "re_test_key_not_a_real_credential", from: "Tavan Tansag <notifications@tavantansag.com>" };
function fixture() {
  const rows = new Map<string, DocumentData>(), versions = new Map<string, number>();
  const transactions = new Map<string, { snapshot: Map<string, DocumentData>; versions: Map<string, number>; reads: Set<string> }>();
  let sequence = 0, clock = epoch, reads = 0, failAcceptedCommit = false;
  const store: FirestoreGateway = {
    documentName: path => `projects/test/databases/test/documents/${path}`,
    async begin() { const id = String(++sequence); transactions.set(id, { snapshot: new Map(structuredClone([...rows])), versions: new Map(versions), reads: new Set() }); return id; },
    async readMany(paths, transaction) {
      reads++;
      const tx = transaction ? transactions.get(transaction)! : null;
      return new Map(paths.map(path => { tx?.reads.add(path); const data = (tx?.snapshot ?? rows).get(path); return [path, data ? { path, data: structuredClone(data) } : null]; }));
    },
    async commit(writes, transaction) {
      const tx = transaction ? transactions.get(transaction)! : null;
      for (const path of tx?.reads ?? []) if ((tx!.versions.get(path) ?? 0) !== (versions.get(path) ?? 0)) throw new PrivateStoreError("ABORTED");
      const pending = writes.map(write => {
        const path = write.update.name.split("/documents/")[1], data = decodeFields(write.update.fields);
        if (failAcceptedCommit && data.status === "accepted") throw new PrivateStoreError();
        return { path, data };
      });
      for (const { path, data } of pending) { rows.set(path, data); versions.set(path, (versions.get(path) ?? 0) + 1); }
      if (transaction) transactions.delete(transaction);
    },
    async rollback(transaction) { transactions.delete(transaction); },
    async pipeline() { throw new Error("Notification delivery must not scan customer data"); },
  };
  const record = notificationForInquiry(reference, "TT-001", "mn", clock);
  rows.set(notificationPath(record.id), record);
  const current = () => notificationRecordSchema.parse(rows.get(notificationPath(record.id)));
  const make = (fetcher: typeof fetch, readConfig = (): NotificationConfig | null => config) => createNotificationProcessor({ store, config: readConfig, fetcher, now: () => clock });
  return { rows, store, record, current, make, readCount: () => reads, advance: (ms: number) => { clock += ms; }, failAccepted: (value: boolean) => { failAcceptedCommit = value; } };
}
const success = () => Response.json({ id: "550e8400-e29b-41d4-a716-446655440000" });

test("notification records contain only bounded system identifiers, with no customer data", () => {
  const record = notificationForInquiry(reference, "TT-001", "mn", epoch);
  const community = notificationForCommunity(`CM-${"a".repeat(64)}`, "en", epoch);
  assert.equal(record.status, "pending"); assert.equal(record.nextAttemptAt, record.createdAt);
  assert.equal(community.productId, null); assert.equal(community.envelope, null);
  assert.equal(notificationPath(record.id), `notification_outbox/inquiry-${reference}`);
  assert.throws(() => notificationForInquiry("../../customers", "TT-001", "mn", epoch));
  assert.throws(() => notificationForInquiry(reference, "<script>alert(1)</script>", "mn", epoch));
  assert.throws(() => notificationForCommunity(reference, "en", epoch));
  assert.equal(notificationEnvelope(community, config.from).to, notificationRecipient);
  assert.equal(notificationEnvelope(record, config.from).text.includes("https://tavantansag.com/mn/staff"), true);
  assert.equal(notificationRecordSchema.safeParse({ ...record, customerEmail: "private@example.com" }).success, false);
});

test("disabled or invalid configuration and invalid IDs never call storage or the provider", async () => {
  const f = fixture(); let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return success(); };
  for (const value of [null, { ...config, apiKey: "" }, { ...config, from: "mail@example.com\r\nBcc: stranger@example.com" }]) {
    assert.deepEqual(await f.make(fetcher, () => value)(f.record.id), { status: "disabled" });
  }
  assert.deepEqual(await f.make(fetcher)("../../customers"), { status: "review" });
  assert.equal(calls, 0); assert.equal(f.readCount(), 0); assert.equal(f.current().attemptCount, 0);
});

test("successful delivery records provider acceptance, fixes the recipient, and replay cannot resend", async () => {
  const f = fixture(); const requests: { url: string; body: unknown; key: string | null }[] = [];
  const process = f.make(async (url, init) => { requests.push({ url: String(url), body: JSON.parse(String(init?.body)), key: new Headers(init?.headers).get("Idempotency-Key") }); return success(); });
  assert.deepEqual(await process(f.record.id), { status: "accepted" });
  assert.deepEqual(await process(f.record.id), { status: "done" });
  assert.equal(requests.length, 1); assert.equal(requests[0].url, "https://api.resend.com/emails");
  assert.equal(requests[0].key, `tavan-new-request-v1/${f.record.id}`);
  assert.deepEqual((requests[0].body as { to: string[] }).to, ["amardelgerekh@gmail.com"]);
  const record = f.current(); assert.equal(record.status, "accepted"); assert.equal(record.attemptCount, 1);
  assert.equal(record.acceptedAt, record.updatedAt); assert.ok(record.providerId); assert.equal(record.nextAttemptAt, null);
  assert.equal(JSON.stringify([...f.rows]).includes(config.apiKey), false);
  assert.equal(Object.hasOwn(record, "deliveredAt"), false);
});

test("concurrent workers lease one notification and only one reaches the provider", async () => {
  const f = fixture(); let calls = 0;
  const process = f.make(async () => { calls++; return success(); });
  const results = await Promise.all([process(f.record.id), process(f.record.id)]);
  assert.equal(calls, 1); assert.equal(f.current().status, "accepted");
  assert.equal(results.filter(result => result.status === "accepted").length, 1);
  assert.ok(results.every(result => ["accepted", "retry", "done"].includes(result.status)));
});

test("transient retries respect delay and preserve the exact first payload when configuration changes", async () => {
  const f = fixture(); let calls = 0; let currentConfig = config;
  const bodies: string[] = [], keys: (string | null)[] = [];
  const process = f.make(async (_url, init) => {
    calls++; bodies.push(String(init?.body)); keys.push(new Headers(init?.headers).get("Idempotency-Key"));
    return calls === 1 ? Response.json({ name: "rate_limit_exceeded" }, { status: 429 }) : success();
  }, () => currentConfig);
  assert.deepEqual(await process(f.record.id), { status: "retry", retryAfterSeconds: 30 });
  assert.equal(f.current().status, "failed");
  assert.deepEqual(await process(f.record.id), { status: "retry", retryAfterSeconds: 30 }); assert.equal(calls, 1);
  f.advance(30_000); currentConfig = { ...config, from: "Changed <other@tavantansag.com>" };
  assert.deepEqual(await process(f.record.id), { status: "accepted" });
  assert.equal(calls, 2); assert.equal(bodies[0], bodies[1]); assert.equal(keys[0], keys[1]);
  assert.equal(f.current().envelope?.from, config.from);
});

test("ambiguous timeouts become review before provider idempotency expires and cannot resend", async () => {
  const f = fixture(); let calls = 0;
  const process = f.make(async () => { calls++; throw new Error("provider error with private payload"); });
  assert.equal((await process(f.record.id)).status, "retry");
  assert.equal(f.current().lastError, "transport_uncertain");
  f.advance(23 * 60 * 60 * 1000);
  assert.deepEqual(await process(f.record.id), { status: "review" });
  f.advance(48 * 60 * 60 * 1000);
  assert.deepEqual(await process(f.record.id), { status: "review" });
  assert.equal(calls, 1); assert.equal(f.current().lastError, "retry_window_expired");
  assert.equal(JSON.stringify([...f.rows]).includes("private payload"), false);
});

test("a lost acceptance write retries with the same key and recovers provider acceptance without a second email", async () => {
  const f = fixture(); let calls = 0; const providerIds = new Map<string, string>();
  const process = f.make(async (_url, init) => {
    calls++; const key = new Headers(init?.headers).get("Idempotency-Key")!;
    if (!providerIds.has(key)) providerIds.set(key, "provider-email-1");
    return Response.json({ id: providerIds.get(key) });
  });
  f.failAccepted(true); assert.equal((await process(f.record.id)).status, "retry");
  assert.equal(f.current().status, "sending"); assert.equal(providerIds.size, 1);
  f.failAccepted(false); f.advance(60_000);
  assert.deepEqual(await process(f.record.id), { status: "accepted" });
  assert.equal(calls, 2); assert.equal(providerIds.size, 1); assert.equal(f.current().providerId, "provider-email-1");
  assert.deepEqual(await process(f.record.id), { status: "done" }); assert.equal(calls, 2);
});

test("permanent provider rejection and payload conflicts stop without recording provider response details", async () => {
  for (const status of [400, 401, 403, 409, 422]) {
    const f = fixture(); let calls = 0;
    const process = f.make(async () => { calls++; return Response.json({ name: "invalid_idempotent_request", message: "secret-provider-detail" }, { status }); });
    assert.deepEqual(await process(f.record.id), { status: "review" });
    assert.deepEqual(await process(f.record.id), { status: "review" });
    assert.equal(calls, 1); assert.equal(f.current().nextAttemptAt, null);
    assert.equal(JSON.stringify([...f.rows]).includes("secret-provider-detail"), false);
  }
});

test("provider concurrent-idempotency conflict and malformed success remain safe retryable outcomes", async () => {
  for (const response of [Response.json({ name: "concurrent_idempotent_requests" }, { status: 409 }), Response.json({ unexpected: "body" })]) {
    const f = fixture(); const result = await f.make(async () => response)(f.record.id);
    assert.equal(result.status, "retry"); assert.equal(f.current().status, "failed"); assert.equal(f.current().acceptedAt, null);
  }
});

test("malformed and altered notification payloads cannot send mail or read source customer collections", async () => {
  const variants = [
    (row: NotificationRecord) => ({ ...row, id: `community-CM-${"a".repeat(64)}` }),
    (row: NotificationRecord) => ({ ...row, status: "failed", attemptCount: 1, firstAttemptAt: row.createdAt, envelope: { ...notificationEnvelope(row, config.from), to: "stranger@example.com" } }),
    (row: NotificationRecord) => ({ ...row, status: "failed", attemptCount: 1, firstAttemptAt: row.createdAt, envelope: { ...notificationEnvelope(row, config.from), text: "customer private message" } }),
  ];
  for (const mutate of variants) {
    const f = fixture(); f.rows.set(notificationPath(f.record.id), mutate(f.record)); let calls = 0;
    assert.deepEqual(await f.make(async () => { calls++; return success(); })(f.record.id), { status: "review" }); assert.equal(calls, 0);
  }
  const f = fixture(); f.rows.clear(); let calls = 0;
  assert.deepEqual(await f.make(async () => { calls++; return success(); })(f.record.id), { status: "done" }); assert.equal(calls, 0);
});

test("delivery tolerates Firestore map ordering and never steals the final permitted active lease", async () => {
  const f = fixture();
  const at = new Date(epoch).toISOString(), until = new Date(epoch + 60_000).toISOString();
  const original = notificationEnvelope(f.record, config.from);
  const envelope = { text: original.text, subject: original.subject, to: original.to, from: original.from };
  f.rows.set(notificationPath(f.record.id), { ...f.record, status: "sending", attemptCount: 12, firstAttemptAt: at, envelope, leaseToken: "00000000-0000-4000-8000-000000000001", leaseUntil: until, nextAttemptAt: until });
  let calls = 0; const process = f.make(async () => { calls++; return success(); });
  assert.deepEqual(await process(f.record.id), { status: "retry", retryAfterSeconds: 60 });
  assert.equal(f.current().status, "sending"); f.advance(60_000);
  assert.deepEqual(await process(f.record.id), { status: "review" });
  assert.equal(calls, 0); assert.equal(f.current().lastError, "attempt_limit");
});
