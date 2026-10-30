import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { requestOriginAllowed } from "../src/lib/server/request-origin";
import { createInquiryHandler } from "../src/lib/server/inquiry-handler";

const canonical = "https://tavantansag.com", preview = "https://tavan-tansag-preview.vercel.app";
const req = (origin?: string, host = canonical) => new Request(host + "/api/example", { headers: origin === undefined ? {} : { Origin: origin } });
test("shared origin policy trusts only exact aliases and requires an Origin for staff writes", () => {
  for (const configured of [canonical, preview]) {
    for (const origin of [canonical, preview]) assert.equal(requestOriginAllowed(req(origin), configured), true);
    for (const origin of ["https://foreign.example", "https://tavantansag.com.evil.example", "https://other.vercel.app", "http://tavantansag.com", "https://tavantansag.com:444", "null", ""]) assert.equal(requestOriginAllowed(req(origin, "https://foreign.example"), configured), false);
    assert.equal(requestOriginAllowed(req(), configured), false);
    assert.equal(requestOriginAllowed(req(), configured, true), true);
    assert.equal(requestOriginAllowed(req("https://foreign.example", "https://foreign.example"), configured), false);
  }
  assert.equal(requestOriginAllowed(req("http://localhost:3000", "http://localhost:3000")), true);
  assert.equal(requestOriginAllowed(req(preview), "https://test.example"), false);
});

test("existing inquiry intake accepts the verified preview alias without accepting other Vercel hosts", async () => {
  let saved = 0;
  const handler = createInquiryHandler({ allowedOrigin: canonical, configured: () => true, persist: async () => { saved++; return { ok: true, reference: "TT-12345678901234567890", duplicate: false }; } });
  const body = { name: "Test Visitor", contactMethod: "email", contactValue: "test@example.invalid", message: "Test-only contact request.", locale: "en" };
  const request = (origin: string) => new Request(preview + "/api/inquiries", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "Idempotency-Key": "test-origin-key-0001" }, body: JSON.stringify(body) });
  assert.equal((await handler(request(preview))).status, 201);
  assert.equal((await handler(request("https://other.vercel.app"))).status, 403);
  assert.equal(saved, 1);
});

test("actual staff patch reader accepts either verified alias and rejects missing or external Origin", () => {
  // server-only modules use Next's server condition; no credential or network access is needed.
  const moduleUrl = new URL("../src/lib/server/staff-http.ts", import.meta.url).href;
  const script = `import assert from 'node:assert/strict';
    import {readStaffPatch} from ${JSON.stringify(moduleUrl)};
    process.env.SITE_ORIGIN=${JSON.stringify(canonical)};
    const body={revision:0,status:'contacted'};
    const request=origin=>new Request(${JSON.stringify(preview + "/api/staff/community/example")},{method:'PATCH',headers:{'Content-Type':'application/json',...(origin===undefined?{}:{Origin:origin})},body:JSON.stringify(body)});
    for(const origin of ${JSON.stringify([canonical, preview])})assert.deepEqual(await readStaffPatch(request(origin)),body);
    for(const origin of [undefined,'https://foreign.example','https://other.vercel.app','https://tavantansag.com.evil.example'])await assert.rejects(readStaffPatch(request(origin)),{status:403});`;
  execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e", script], { stdio: "pipe" });
});
