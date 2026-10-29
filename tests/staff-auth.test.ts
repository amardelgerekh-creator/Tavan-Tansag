import { test } from "node:test";
import assert from "node:assert/strict";
import { staffEmails, staffIdentity } from "../src/lib/server/staff-policy";

const now = 1800000000;
const owner = { sub: "owner-uid", email: "owner@example.com", email_verified: true, iat: now - 10, auth_time: now - 20, firebase: { sign_in_provider: "google.com" } };
test("staff access requires verified Google identity on explicit allowlist", () => {
  assert.deepEqual(staffIdentity(owner, ["owner@example.com"], now), { uid: "owner-uid", email: "owner@example.com" });
  for (const changed of [{ email_verified: false }, { email: "other@example.com" }, { sub: "" }, { firebase: { sign_in_provider: "password" } }, { iat: now + 100 }, { auth_time: now + 100 }, { auth_time: undefined }]) {
    assert.equal(staffIdentity({ ...owner, ...changed }, ["owner@example.com"], now), null);
  }
  assert.equal(staffIdentity(owner, [], now), null);
  assert.deepEqual(staffEmails(" Owner@example.com, , second@example.com "), ["owner@example.com", "second@example.com"]);
});
