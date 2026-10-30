import assert from "node:assert/strict";
import test from "node:test";
import { communityConsentVersion, communityRecordSchema, type CommunityInput } from "../src/lib/community-contract";
import { createCommunityPersistence } from "../src/lib/server/community-persistence";
import { createCommunityStaffStore, communityListPipeline } from "../src/lib/server/community-staff-engine";
import { decodeFields, PrivateStoreError, type DocumentData, type FirestoreGateway } from "../src/lib/server/firestore-protocol";

const actor = { uid: "staff-uid", email: "owner@example.com" };
const input: CommunityInput = { email: "TEST@example.com", firstName: "Test Visitor", interests: ["men", "snuff-bottles"], locale: "en", consent: true };
const key = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
function fixture(notificationsEnabled = false) {
  const rows = new Map<string, DocumentData>(), versions = new Map<string, number>();
  const transactions = new Map<string, { snapshot: Map<string, DocumentData>; versions: Map<string, number>; reads: Set<string> }>();
  let sequence = 0, clock = Date.parse("2026-10-30T02:00:00.000Z"), fail = false, pipelineCalls = 0;
  const store: FirestoreGateway = {
    documentName: path => `projects/test/databases/test/documents/${path}`,
    async begin() { const id = String(++sequence); transactions.set(id, { snapshot: new Map(structuredClone([...rows])), versions: new Map(versions), reads: new Set() }); return id; },
    async readMany(paths, transaction) {
      const tx = transaction ? transactions.get(transaction)! : null;
      return new Map(paths.map(path => { tx?.reads.add(path); const data = (tx?.snapshot ?? rows).get(path); return [path, data ? { path, data: structuredClone(data) } : null]; }));
    },
    async commit(writes, transaction) {
      if (fail) throw new PrivateStoreError();
      const tx = transaction ? transactions.get(transaction)! : null;
      for (const path of tx?.reads ?? []) if ((tx?.versions.get(path) ?? 0) !== (versions.get(path) ?? 0)) throw new PrivateStoreError("ABORTED");
      const pending = writes.map(write => {
        const path = write.update.name.split("/documents/")[1];
        if (write.currentDocument && "exists" in write.currentDocument && rows.has(path) !== write.currentDocument.exists) throw new PrivateStoreError("ABORTED");
        return { path, data: decodeFields(write.update.fields) };
      });
      for (const { path, data } of pending) { rows.set(path, data); versions.set(path, (versions.get(path) ?? 0) + 1); }
      if (transaction) transactions.delete(transaction);
    },
    async rollback(transaction) { transactions.delete(transaction); },
    async pipeline(body: any) {
      pipelineCalls++;
      const expr = (value: any, row: DocumentData): any => {
        if (value.fieldReferenceValue) return row[value.fieldReferenceValue];
        if ("stringValue" in value) return value.stringValue;
        const { name, args } = value.functionValue; const values = args.map((arg: any) => expr(arg, row));
        if (name === "equal") return values[0] === values[1];
        if (name === "less_than") return values[0] < values[1];
        if (name === "and") return values.every(Boolean);
        if (name === "or") return values.some(Boolean);
        throw new Error("Unsupported test expression");
      };
      let result: DocumentData[] = [];
      for (const stage of body.structuredPipeline.pipeline.stages) {
        if (stage.name === "collection") {
          const prefix = stage.args[0].referenceValue.slice(1) + "/";
          result = [...rows].filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/")).map(([, data]) => structuredClone(data));
        } else if (stage.name === "where") result = result.filter(row => expr(stage.args[0], row));
        else if (stage.name === "sort") result.sort((a, b) => {
          for (const arg of stage.args) { const { expression, direction } = arg.mapValue.fields; const key = expression.fieldReferenceValue; const comparison = String(a[key]).localeCompare(String(b[key])); if (comparison) return direction.stringValue === "descending" ? -comparison : comparison; } return 0;
        });
        else if (stage.name === "limit") result = result.slice(0, Number(stage.args[0].integerValue));
        else if (stage.name === "select") result = result.map(row => Object.fromEntries(Object.entries(stage.args[0].mapValue.fields).map(([name, value]) => [name, expr(value, row)])));
        else throw new Error("Unsupported test stage");
      }
      return result;
    },
  };
  const persist = createCommunityPersistence({ store, hashSecret: "test-only-secret-at-least-32-characters", notificationsEnabled, now: () => clock });
  const staff = createCommunityStaffStore({ store, allowedEmails: [actor.email], now: () => clock });
  const records = () => [...rows].filter(([path]) => /^community_requests\/[^/]+$/.test(path)).map(([, data]) => communityRecordSchema.parse(data));
  return { rows, store, persist, staff, records, advance: (ms: number) => { clock += ms; }, fail: () => { fail = true; }, pipelineCalls: () => pipelineCalls };
}

test("community storage atomically records explicit consent, unverified status, replay key and non-PII limiters", async () => {
  const f = fixture(); assert.deepEqual(await f.persist(input, key(1), { clientIp: "203.0.113.8" }), { ok: true });
  assert.equal(f.rows.size, 5);
  const row = f.records()[0]; assert.equal(row.email, "test@example.com"); assert.equal(row.consent, true); assert.equal(row.consentVersion, communityConsentVersion); assert.equal(row.emailVerified, false); assert.equal(row.status, "requested"); assert.equal(row.revision, 0);
  assert.equal(row.createdAt, row.consentAt);
  const limits = [...f.rows].filter(([path]) => path.startsWith("community_limits/")); assert.equal(limits.length, 2);
  assert.equal(JSON.stringify(limits).includes("test@example.com"), false);
  assert.equal(JSON.stringify([...f.rows]).includes("203.0.113.8"), false);
});

test("concurrent identical-key retries have one request, one audit and one limiter increment", async () => {
  const f = fixture(); const results = await Promise.all([f.persist(input, key(1)), f.persist(input, key(1))]);
  assert.deepEqual(results, [{ ok: true }, { ok: true }]); assert.equal(f.rows.size, 5);
  for (const [path, data] of f.rows) if (path.startsWith("community_limits/")) assert.equal(data.count, 1);
  assert.deepEqual(await f.persist({ ...input, email: "test@example.com", interests: ["snuff-bottles", "men"] }, key(1)), { ok: true });
  assert.deepEqual(await f.persist({ ...input, firstName: "Changed" }, key(1)), { ok: false, code: "IDEMPOTENCY_CONFLICT" });
});

test("email deduplication survives simultaneous distinct keys and does not overwrite original preferences", async () => {
  const f = fixture(); assert.deepEqual(await Promise.all([f.persist(input, key(1)), f.persist(input, key(2))]), [{ ok: true }, { ok: true }]);
  assert.equal(f.records().length, 1);
  assert.deepEqual(await f.persist({ ...input, firstName: "Different Visitor", interests: ["women"] }, key(3)), { ok: true });
  assert.equal(f.records()[0].firstName, input.firstName); assert.deepEqual(f.records()[0].interests, input.interests);
  assert.equal([...f.rows.keys()].filter(path => path.endsWith("/activity/created")).length, 1);
});

test("new community request atomically queues once across concurrent email deduplication, without personal data", async () => {
  const f = fixture(true);
  const results = await Promise.all([f.persist(input, key(1)), f.persist(input, key(2))]);
  assert.ok(results.every(result => result.ok));
  assert.equal(results.filter(result => result.ok && result.notificationId).length, 1);
  const queued = [...f.rows].filter(([path]) => path.startsWith("notification_outbox/"));
  assert.equal(queued.length, 1);
  const row = queued[0][1];
  assert.equal(row.sourceId, f.records()[0].id);
  assert.equal(row.productId, null);
  assert.equal(row.status, "pending");
  assert.equal(row.envelope, null);
  assert.equal(JSON.stringify(row).includes(input.email.toLowerCase()), false);
  assert.equal(JSON.stringify(row).includes(input.firstName), false);
  assert.deepEqual(await f.persist(input, key(1)), { ok: true });
  const failed = fixture(true); failed.fail();
  assert.deepEqual(await failed.persist(input, key(3)), { ok: false, code: "UNAVAILABLE" });
  assert.equal(failed.rows.size, 0);
});

test("email limits survive IP changes, replay remains safe, and counters expire after 15 minutes", async () => {
  const f = fixture();
  for (let i = 1; i <= 3; i++) assert.deepEqual(await f.persist(input, key(i), { clientIp: `203.0.113.${i}` }), { ok: true });
  assert.deepEqual(await f.persist(input, key(4), { clientIp: "203.0.113.99" }), { ok: false, code: "RATE_LIMITED" });
  assert.deepEqual(await f.persist(input, key(1)), { ok: true });
  f.advance(15 * 60 * 1000); assert.deepEqual(await f.persist(input, key(4)), { ok: true });
});

test("IP limits apply across different email addresses and unconsented/failed writes never confirm", async () => {
  const f = fixture();
  for (let i = 1; i <= 10; i++) assert.deepEqual(await f.persist({ ...input, email: `visitor${i}@example.com` }, key(i), { clientIp: "203.0.113.8" }), { ok: true });
  assert.deepEqual(await f.persist({ ...input, email: "other@example.com" }, key(11), { clientIp: "203.0.113.8" }), { ok: false, code: "RATE_LIMITED" });
  const fresh = fixture(); assert.deepEqual(await fresh.persist({ ...input, consent: false } as unknown as CommunityInput, key(1)), { ok: false, code: "UNAVAILABLE" }); assert.equal(fresh.rows.size, 0);
  fresh.fail(); assert.deepEqual(await fresh.persist(input, key(1)), { ok: false, code: "UNAVAILABLE" }); assert.equal(fresh.rows.size, 0);
});

test("staff status changes preserve consent/customer data, audit atomically and enforce revisions", async () => {
  const f = fixture(); await f.persist(input, key(1)); const current = f.records()[0];
  const next = await f.staff.update(current.id, { revision: 0, status: "contacted" }, actor);
  assert.equal(next.revision, 1); assert.equal(next.status, "contacted"); assert.equal(next.emailVerified, false);
  assert.deepEqual({ ...next, status: current.status, revision: current.revision, updatedAt: current.updatedAt }, current);
  const audit = f.rows.get(`community_requests/${current.id}/activity/revision-1`)!;
  assert.equal(audit.actorUid, actor.uid); assert.equal(audit.previousStatus, "requested"); assert.equal(audit.status, "contacted");
  await assert.rejects(f.staff.update(current.id, { revision: 0, status: "withdrawn" }, actor), { code: "CONFLICT" });
  await assert.rejects(f.staff.update(current.id, { revision: 1, status: "requested", emailVerified: true } as never, actor), { code: "INVALID_INPUT" });
});

test("withdrawal cannot be reversed by anonymous duplicate requests or a status-only staff change", async () => {
  const f = fixture(); await f.persist(input, key(1)); const current = f.records()[0];
  const withdrawn = await f.staff.update(current.id, { revision: 0, status: "withdrawn" }, actor);
  assert.deepEqual(await f.persist(input, key(2)), { ok: true }); assert.deepEqual(f.records()[0], withdrawn);
  await assert.rejects(f.staff.update(current.id, { revision: 1, status: "requested" }, actor), { code: "INVALID_INPUT" });
  assert.deepEqual(await f.staff.update(current.id, { revision: 1, status: "withdrawn" }, actor), withdrawn);
});

test("staff allowlist checks run before private reads and mutations", async () => {
  const f = fixture(); const stranger = { uid: "stranger", email: "stranger@example.com" };
  await assert.rejects(f.staff.list({}, stranger), { code: "INVALID_INPUT" }); assert.equal(f.pipelineCalls(), 0);
  await assert.rejects(f.staff.update(`CM-${"a".repeat(64)}`, { revision: 0, status: "contacted" }, stranger), { code: "INVALID_INPUT" }); assert.equal(f.rows.size, 0);
  await assert.rejects(f.staff.list({}, { ...actor, uid: "" }), { code: "INVALID_INPUT" });
});

test("staff pagination has a stable same-timestamp tie breaker and only returns the selected status", async () => {
  const f = fixture();
  for (let i = 1; i <= 5; i++) await f.persist({ ...input, email: `page${i}@example.com` }, key(i));
  const first = await f.staff.list({ limit: 2 }, actor); assert.equal(first.items.length, 2); assert.equal(first.hasMore, true); assert.ok(first.nextCursor);
  const second = await f.staff.list({ limit: 2, before: first.nextCursor }, actor); assert.equal(second.items.length, 2); assert.ok(second.nextCursor);
  const third = await f.staff.list({ limit: 2, before: second.nextCursor }, actor); assert.equal(third.items.length, 1); assert.equal(third.hasMore, false); assert.equal(third.nextCursor, null);
  assert.equal(new Set([...first.items, ...second.items, ...third.items].map(row => row.id)).size, 5);
  const target = first.items[0]; await f.staff.update(target.id, { revision: 0, status: "contacted" }, actor);
  assert.deepEqual((await f.staff.list({ status: "contacted" }, actor)).items.map(row => row.id), [target.id]);
  for (const options of [{ limit: 31 }, { before: "not-a-valid-cursor" }, { status: "subscribed" }, { extra: "field" }]) assert.throws(() => communityListPipeline(options as never), { code: "INVALID_INPUT" });
});

test("staff storage failure cannot leave an unaudited status change", async () => {
  const f = fixture(); await f.persist(input, key(1)); const current = f.records()[0]; const size = f.rows.size; f.fail();
  await assert.rejects(f.staff.update(current.id, { revision: 0, status: "withdrawn" }, actor), { code: "UNAVAILABLE" });
  assert.deepEqual(f.records()[0], current); assert.equal(f.rows.size, size);
});
