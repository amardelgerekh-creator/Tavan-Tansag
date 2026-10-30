import assert from "node:assert/strict";
import test from "node:test";
import { createInquiryPersistence } from "../src/lib/server/inquiry-persistence";
import { decodeFields, PrivateStoreError, type FirestoreGateway, type FirestoreWrite, type DocumentData } from "../src/lib/server/firestore-protocol";
import type { InquiryInput } from "../src/lib/server/inquiry-contract";
import { inquiryClientIp } from "../src/lib/server/inquiry-handler";
import { intakeConfigured } from "../src/lib/server/inquiry-config";

const input: InquiryInput = { name: "Test visitor", contactMethod: "email", contactValue: "TEST@example.com", message: "Please tell me about this object.", locale: "en", productId: "TT-001" };
const product = { visibility: "public", publicationStatus: "sample", verificationStatus: "needs_review", name: { mn: "Жишиг эдлэл", en: "Sample object" } };
const key = (i: number) => `test-idempotency-key-${String(i).padStart(4, "0")}`;

/** MVCC transaction fake: concurrent reads conflict before any write is applied. */
function storeFixture(notificationsEnabled = false) {
  const rows = new Map<string, DocumentData>([["catalog_public/TT-001", product]]);
  const versions = new Map<string, number>();
  const transactions = new Map<string, { snapshot: Map<string, DocumentData>; versions: Map<string, number>; reads: Set<string> }>();
  let sequence = 0;
  let referenceSequence = 0;
  let clock = Date.parse("2026-10-29T12:00:00.000Z");
  let failCommit = false;
  const store: FirestoreGateway = {
    documentName: (path) => `projects/test/databases/test/documents/${path}`,
    async begin() {
      const id = String(++sequence);
      transactions.set(id, { snapshot: new Map(structuredClone([...rows])), versions: new Map(versions), reads: new Set() });
      return id;
    },
    async readMany(paths, transaction) {
      const tx = transaction ? transactions.get(transaction)! : null;
      return new Map(paths.map((path) => {
        tx?.reads.add(path);
        const value = (tx?.snapshot ?? rows).get(path);
        return [path, value ? { path, data: structuredClone(value) } : null];
      }));
    },
    async commit(writes: FirestoreWrite[], transaction) {
      if (failCommit) throw new PrivateStoreError();
      const tx = transaction ? transactions.get(transaction)! : null;
      for (const path of tx?.reads ?? []) {
        if ((tx?.versions.get(path) ?? 0) !== (versions.get(path) ?? 0)) throw new PrivateStoreError("ABORTED");
      }
      const pending = writes.map((write) => {
        const path = write.update.name.split("/documents/")[1];
        if (write.currentDocument && "exists" in write.currentDocument && rows.has(path) !== write.currentDocument.exists) throw new PrivateStoreError("ABORTED");
        return { path, data: decodeFields(write.update.fields) };
      });
      for (const { path, data } of pending) {
        rows.set(path, data);
        versions.set(path, (versions.get(path) ?? 0) + 1);
      }
    },
    async rollback(transaction) { transactions.delete(transaction); },
    async pipeline() { return []; },
  };
  const persist = createInquiryPersistence({
    store, hashSecret: "test-only-hash-secret-with-32-characters", assignee: "owner@example.com", includeSamples: true,
    notificationsEnabled,
    now: () => clock, reference: () => `TT-${String(++referenceSequence).padStart(20, "0")}`,
  });
  return { rows, persist, advance: (ms: number) => { clock += ms; }, fail: () => { failCommit = true; } };
}

test("inquiry, durable replay key, counters and activity are committed together without raw IP in storage", async () => {
  const fixture = storeFixture();
  const result = await fixture.persist(input, key(1), { clientIp: "203.0.113.9" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(fixture.rows.size, 6);
  const inquiry = fixture.rows.get(`inquiries/${result.reference}`)!;
  assert.equal(inquiry.contactValue, "test@example.com");
  assert.equal(inquiry.status, "new");
  assert.equal(inquiry.assignee, "owner@example.com");
  assert.equal(inquiry.productId, "TT-001");
  assert.equal(inquiry.revision, 0);
  assert.equal(JSON.stringify([...fixture.rows]).includes("203.0.113.9"), false);
  const limits = [...fixture.rows].filter(([path]) => path.startsWith("inquiry_limits/"));
  assert.equal(limits.length, 2);
  assert.equal(JSON.stringify(limits).includes("test@example.com"), false);
});

test("concurrent same-key requests create exactly one inquiry and replay its original reference", async () => {
  const fixture = storeFixture();
  const [first, second] = await Promise.all([
    fixture.persist(input, key(1), { clientIp: "203.0.113.1" }),
    fixture.persist(input, key(1), { clientIp: "203.0.113.1" }),
  ]);
  assert.ok(first.ok && second.ok);
  assert.equal(first.reference, second.reference);
  assert.equal([first.duplicate, second.duplicate].filter(Boolean).length, 1);
  assert.equal([...fixture.rows.keys()].filter((path) => /^inquiries\/[^/]+$/.test(path)).length, 1);
  for (const [path, data] of fixture.rows) if (path.startsWith("inquiry_limits/")) assert.equal(data.count, 1);
});

test("same-key payload changes are conflicts and do not replace the original customer request", async () => {
  const fixture = storeFixture();
  const saved = await fixture.persist(input, key(1));
  const result = await fixture.persist({ ...input, message: "A different request with the same key." }, key(1));
  assert.deepEqual(result, { ok: false, code: "IDEMPOTENCY_CONFLICT" });
  assert.ok(saved.ok);
  assert.equal(fixture.rows.get(`inquiries/${saved.reference}`)?.message, input.message);
});

test("service intent is persisted with the piece and protected against retry-key changes", async () => {
  const fixture = storeFixture();
  const saved = await fixture.persist({ ...input, purpose: "international" }, key(1));
  assert.ok(saved.ok);
  assert.equal(fixture.rows.get(`inquiries/${saved.reference}`)?.purpose, "international");
  assert.equal(fixture.rows.get(`inquiries/${saved.reference}`)?.productId, "TT-001");
  assert.deepEqual(await fixture.persist({ ...input, purpose: "visit" }, key(1)), { ok: false, code: "IDEMPOTENCY_CONFLICT" });
});

test("general intent keeps compatibility with enquiries submitted before intent was added", async () => {
  const fixture = storeFixture();
  const saved = await fixture.persist(input, key(1));
  const replay = await fixture.persist({ ...input, purpose: "general" }, key(1));
  assert.ok(saved.ok && replay.ok);
  assert.equal(saved.reference, replay.reference);
  assert.equal(replay.duplicate, true);
});

test("contact throttling survives IP changes and resets after the shared time window", async () => {
  const fixture = storeFixture();
  for (let i = 1; i <= 3; i++) assert.equal((await fixture.persist(input, key(i), { clientIp: `203.0.113.${i}` })).ok, true);
  assert.deepEqual(await fixture.persist(input, key(4), { clientIp: "203.0.113.99" }), { ok: false, code: "RATE_LIMITED" });
  // A harmless retry still confirms the original request even at the rate limit.
  const replay = await fixture.persist(input, key(1), { clientIp: "203.0.113.99" });
  assert.ok(replay.ok && replay.duplicate);
  fixture.advance(15 * 60 * 1000);
  assert.equal((await fixture.persist(input, key(4), { clientIp: "203.0.113.99" })).ok, true);
});

test("IP throttling cannot be evaded by changing contact details", async () => {
  const fixture = storeFixture();
  for (let i = 1; i <= 10; i++) assert.equal((await fixture.persist({ ...input, contactValue: `test${i}@example.com` }, key(i), { clientIp: "203.0.113.7" })).ok, true);
  assert.deepEqual(await fixture.persist({ ...input, contactValue: "new@example.com" }, key(11), { clientIp: "203.0.113.7" }), { ok: false, code: "RATE_LIMITED" });
});

test("unknown and private products cannot create inquiries", async () => {
  const fixture = storeFixture();
  assert.deepEqual(await fixture.persist({ ...input, productId: "TT-999" }, key(1)), { ok: false, code: "UNKNOWN_PRODUCT" });
  fixture.rows.set("catalog_public/TT-001", { ...product, publicationStatus: "draft" });
  assert.deepEqual(await fixture.persist(input, key(2)), { ok: false, code: "UNKNOWN_PRODUCT" });
  assert.equal(fixture.rows.size, 1);
});

test("failed commit cannot acknowledge receipt or leave a partial record", async () => {
  const fixture = storeFixture();
  fixture.fail();
  assert.deepEqual(await fixture.persist(input, key(1)), { ok: false, code: "UNAVAILABLE" });
  assert.equal(fixture.rows.size, 1);
});

test("new inquiry and minimal notification outbox are atomic and concurrent retries cannot schedule twice", async () => {
  const f = storeFixture(true);
  const results = await Promise.all([f.persist(input, key(1)), f.persist(input, key(1))]);
  assert.ok(results.every(result => result.ok));
  assert.equal(results.filter(result => result.ok && result.notificationId).length, 1);
  const queued = [...f.rows].filter(([path]) => path.startsWith("notification_outbox/"));
  assert.equal(queued.length, 1);
  const row = queued[0][1];
  assert.equal(row.sourceId, results[0].ok && results[0].reference);
  assert.equal(row.productId, "TT-001");
  assert.equal(row.locale, "en");
  assert.equal(row.status, "pending");
  assert.equal(row.attemptCount, 0);
  assert.equal(row.envelope, null);
  for (const privateValue of [input.name, input.contactValue.toLowerCase(), input.message]) assert.equal(JSON.stringify(row).includes(privateValue), false);
  const failed = storeFixture(true); failed.fail();
  assert.deepEqual(await failed.persist(input, key(2)), { ok: false, code: "UNAVAILABLE" });
  assert.equal(failed.rows.size, 1);
});

test("only a trusted Vercel IP header is considered for distributed abuse protection", () => {
  const request = new Request("https://example.com", { headers: { "x-forwarded-for": "198.51.100.9", "x-vercel-forwarded-for": "203.0.113.3" } });
  assert.equal(inquiryClientIp(request, false), "unidentified");
  assert.equal(inquiryClientIp(request, true), "203.0.113.3");
  assert.equal(inquiryClientIp(new Request("https://example.com", { headers: { "x-forwarded-for": "198.51.100.9" } }), true), "unidentified");
  assert.equal(inquiryClientIp(new Request("https://example.com", { headers: { "x-vercel-forwarded-for": "not-an-ip" } }), true), "unidentified");
});

test("enabling intake also requires complete WIF configuration, a hash secret and an assignee", () => {
  const env = {
    INQUIRIES_ENABLED: "true", FIREBASE_PROJECT_ID: "test-project", FIRESTORE_DATABASE_ID: "test-db",
    GCP_PROJECT_NUMBER: "123456", GCP_SERVICE_ACCOUNT_EMAIL: "vercel@test-project.iam.gserviceaccount.com",
    GCP_WORKLOAD_IDENTITY_POOL_ID: "vercel", GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "vercel",
    INQUIRY_HASH_SECRET: "test-only-hash-secret-with-32-characters", STAFF_EMAILS: "owner@example.com",
  };
  assert.equal(intakeConfigured(env), true);
  assert.equal(intakeConfigured({ ...env, INQUIRY_HASH_SECRET: "" }), false);
  assert.equal(intakeConfigured({ ...env, GCP_SERVICE_ACCOUNT_EMAIL: "" }), false);
  assert.equal(intakeConfigured({ ...env, STAFF_EMAILS: "" }), false);
  assert.equal(intakeConfigured({ ...env, INQUIRIES_ENABLED: "false" }), false);
});
