import assert from "node:assert/strict";
import test from "node:test";
import { communityInputSchema, type CommunityInput, type CommunityPersistenceResult } from "../src/lib/community-contract";
import { createCommunityHandler } from "../src/lib/server/community-handler";

const input: CommunityInput = { email: " Test@Example.com ", firstName: " Visitor ", interests: ["men", "snuff-bottles"], locale: "en", consent: true, website: "" };
const key = "00000000-0000-4000-8000-000000000001";
const request = (body: unknown = input, headers: Record<string, string> = {}) => new Request("https://tavantansag.example/api/community", {
  method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key, Origin: "https://tavantansag.example", ...headers }, body: JSON.stringify(body),
});

test("community input requires affirmative consent, valid unique interests, names and an email", () => {
  const parsed = communityInputSchema.parse(input);
  assert.equal(parsed.email, "test@example.com"); assert.equal(parsed.firstName, "Visitor");
  for (const change of [
    { consent: false }, { consent: undefined }, { interests: [] }, { interests: ["men", "men"] }, { interests: ["other"] },
    { email: "not-email" }, { email: `${"a".repeat(250)}@example.com` }, { firstName: "  " }, { firstName: "x".repeat(81) },
    { lastName: "x".repeat(81) }, { emailVerified: true }, { status: "contacted" }, { consentVersion: "injected" }, { website: "spam" },
  ]) assert.equal(communityInputSchema.safeParse({ ...input, ...change }).success, false);
  assert.equal(communityInputSchema.safeParse({ ...input, lastName: "", interests: ["men", "women", "silverware", "horse", "snuff-bottles"] }).success, true);
});

test("public acknowledgement is generic and follows successful persistence", async () => {
  let saved: CommunityInput | undefined;
  const handler = createCommunityHandler({ configured: () => true, persist: async value => { saved = value; return { ok: true, notificationIds: [`community-CM-${"a".repeat(64)}`, `community-receipt-CM-${"a".repeat(64)}`] }; } });
  const response = await handler(request());
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true, code: "REQUEST_RECEIVED" });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(saved?.email, "test@example.com");
  assert.equal(saved?.firstName, "Visitor");
});

test("public validation, foreign origin and oversized bodies cannot reach persistence", async () => {
  let calls = 0;
  const handler = createCommunityHandler({ configured: () => true, persist: async () => { calls++; return { ok: true }; } });
  assert.equal((await handler(request(input, { Origin: "https://foreign.example" }))).status, 403);
  assert.equal((await handler(request(input, { "Content-Type": "text/plain" }))).status, 415);
  assert.equal((await handler(request(input, { "Idempotency-Key": "invalid" }))).status, 400);
  const invalid = await handler(request({ ...input, consent: false }));
  assert.equal(invalid.status, 400); assert.ok((await invalid.json()).fields.consent.length);
  assert.equal((await handler(request({ ...input, firstName: "Ө".repeat(7000) }))).status, 413);
  assert.equal(calls, 0);
});

test("community persistence errors produce actionable codes without provider details or false success", async () => {
  const disabled = createCommunityHandler({ configured: () => false, persist: async () => { throw new Error("must not persist"); } });
  assert.equal((await disabled(request())).status, 503);
  for (const [code, status] of [["RATE_LIMITED", 429], ["IDEMPOTENCY_CONFLICT", 409], ["UNAVAILABLE", 503]] as const) {
    const handler = createCommunityHandler({ configured: () => true, persist: async (): Promise<CommunityPersistenceResult> => ({ ok: false, code }) });
    const response = await handler(request()); assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { ok: false, code: code === "UNAVAILABLE" ? "PERSISTENCE_UNAVAILABLE" : code });
    if (status === 429) assert.equal(response.headers.get("Retry-After"), "900");
  }
  const failure = createCommunityHandler({ configured: () => true, persist: async () => { throw new Error("provider secret and visitor@example.com"); } });
  assert.deepEqual(await (await failure(request())).json(), { ok: false, code: "PERSISTENCE_UNAVAILABLE" });
});


test("community accepts both exact production aliases but rejects foreign and lookalike origins", async () => {
  let calls = 0;
  for (const configured of ["https://tavantansag.com", "https://tavan-tansag-preview.vercel.app"]) {
    const handler = createCommunityHandler({ configured: () => true, allowedOrigin: configured, persist: async () => { calls++; return { ok: true }; } });
    for (const origin of ["https://tavantansag.com", "https://tavan-tansag-preview.vercel.app"]) {
      const response = await handler(request(input, { Origin: origin }));
      assert.equal(response.status, 202);
      assert.equal(response.headers.has("access-control-allow-origin"), false);
    }
    for (const origin of ["https://foreign.example", "https://tavantansag.com.evil.example", "https://other.vercel.app", "http://tavantansag.com", "https://tavantansag.com:444"]) {
      assert.equal((await handler(request(input, { Origin: origin }))).status, 403);
    }
    // An attacker-controlled Request URL does not become an allowlist entry when configured.
    const forgedHost = new Request("https://foreign.example/api/community", { method: "POST", headers: { Origin: "https://foreign.example", "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(input) });
    assert.equal((await handler(forgedHost)).status, 403);
  }
  assert.equal(calls, 4);
  const dev = createCommunityHandler({ configured: () => true, persist: async () => ({ ok: true }) });
  assert.equal((await dev(new Request("http://localhost:3000/api/community", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(input) }))).status, 202);
});
