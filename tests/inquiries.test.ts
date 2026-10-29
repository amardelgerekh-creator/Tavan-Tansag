import assert from "node:assert/strict";
import test from "node:test";
import { createInquiryHandler } from "../src/lib/server/inquiry-handler";
import {
  inquiryStorageConfigured,
  persistInquiry,
} from "../src/lib/server/inquiry-service";
import type {
  InquiryInput,
  PersistenceResult,
} from "../src/lib/server/inquiry-contract";

const input = {
  name: "Бат Болд",
  contactMethod: "email",
  contactValue: "bat@example.com",
  message: "Энэ эдлэлийн талаар зөвлөгөө авах хүсэлтэй байна.",
  locale: "mn",
  website: "",
};
const key = "test-inquiry-key-0001";
function request(body: unknown = input, headers: Record<string, string> = {}) {
  return new Request("https://tavantansag.example/api/inquiries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": key,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

test("the Firebase preview remains closed without credentials even when the inquiry flag is enabled", async () => {
  const previous = process.env.INQUIRIES_ENABLED;
  const previousSecret = process.env.INQUIRY_HASH_SECRET;
  try {
    process.env.INQUIRIES_ENABLED = "true";
    delete process.env.INQUIRY_HASH_SECRET;
    assert.equal(inquiryStorageConfigured(), false);
    const response = await createInquiryHandler({
      configured: inquiryStorageConfigured,
      persist: persistInquiry,
    })(request());
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "NOT_CONFIGURED");
    assert.deepEqual(await persistInquiry(input as InquiryInput, key), {
      ok: false,
      code: "UNAVAILABLE",
    });
  } finally {
    if (previous === undefined) delete process.env.INQUIRIES_ENABLED;
    else process.env.INQUIRIES_ENABLED = previous;
    if (previousSecret === undefined) delete process.env.INQUIRY_HASH_SECRET;
    else process.env.INQUIRY_HASH_SECRET = previousSecret;
  }
});

test("an unconnected preview cannot report that a customer's inquiry was sent", async () => {
  let called = false;
  const handler = createInquiryHandler({
    configured: () => false,
    persist: async () => {
      called = true;
      throw new Error("Must not be called");
    },
  });
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "NOT_CONFIGURED");
  assert.equal(called, false);
});

test("confirmation follows persistence and returns only the reference", async () => {
  let saved: InquiryInput | undefined;
  let savedKey: string | undefined;
  const handler = createInquiryHandler({
    configured: () => true,
    persist: async (data, idempotencyKey) => {
      saved = data;
      savedKey = idempotencyKey;
      return { ok: true, reference: "TT-12345678ABCDEF00", duplicate: false };
    },
  });
  const response = await handler(request({ ...input, name: "  Бат Болд  " }));
  assert.equal(response.status, 201);
  assert.equal(saved?.name, "Бат Болд");
  assert.equal(savedKey, key);
  assert.deepEqual(await response.json(), {
    ok: true,
    reference: "TT-12345678ABCDEF00",
  });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("a persisted retry is a successful replay with the original reference", async () => {
  const handler = createInquiryHandler({
    configured: () => true,
    persist: async () => ({
      ok: true,
      reference: "TT-12345678ABCDEF00",
      duplicate: true,
    }),
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    reference: "TT-12345678ABCDEF00",
  });
});

test("database failures do not leak provider details or falsely confirm submission", async () => {
  for (const persist of [
    async (): Promise<PersistenceResult> => ({
      ok: false,
      code: "UNAVAILABLE",
    }),
    async (): Promise<PersistenceResult> => {
      throw new Error("sensitive provider response");
    },
  ]) {
    const response = await createInquiryHandler({
      configured: () => true,
      persist,
    })(request());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      ok: false,
      code: "PERSISTENCE_UNAVAILABLE",
    });
  }
});

test("conflicting retry, unpublished product and abuse receive actionable failure statuses", async () => {
  const failures = [
    ["IDEMPOTENCY_CONFLICT", 409],
    ["UNKNOWN_PRODUCT", 400],
    ["RATE_LIMITED", 429],
  ] as const;
  for (const [code, status] of failures) {
    const response = await createInquiryHandler({
      configured: () => true,
      persist: async () => ({ ok: false, code }),
    })(request());
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { ok: false, code });
    if (code === "RATE_LIMITED")
      assert.equal(response.headers.get("Retry-After"), "900");
  }
});

test("honeypot, injected privileges and unusable contact data never reach storage", async () => {
  let saved = 0;
  const handler = createInquiryHandler({
    configured: () => true,
    persist: async () => {
      saved++;
      return { ok: true, reference: "unexpected", duplicate: false };
    },
  });
  const invalid = [
    { ...input, website: "https://spam.example" },
    { ...input, role: "owner" },
    { ...input, contactValue: "not-an-email" },
    { ...input, contactMethod: "phone", contactValue: "......." },
    { ...input, message: "short" },
    { ...input, productId: "non-catalog-id" },
  ];
  for (const body of invalid)
    assert.equal((await handler(request(body))).status, 400);
  assert.equal(saved, 0);
});

test("foreign browser origins are rejected before storage", async () => {
  let saved = false;
  const handler = createInquiryHandler({
    configured: () => true,
    persist: async () => {
      saved = true;
      throw new Error("Must not be called");
    },
  });
  assert.equal(
    (await handler(request(input, { Origin: "https://unrelated.example" })))
      .status,
    403,
  );
  assert.equal(saved, false);
});

test("a same-origin request works with an explicitly configured public origin", async () => {
  const handler = createInquiryHandler({
    configured: () => true,
    allowedOrigin: "https://tavantansag.example",
    persist: async () => ({
      ok: true,
      reference: "TT-12345678ABCDEF00",
      duplicate: false,
    }),
  });
  assert.equal(
    (await handler(request(input, { Origin: "https://tavantansag.example" })))
      .status,
    201,
  );
});

test("payload limits apply to actual bytes even without Content-Length", async () => {
  const handler = createInquiryHandler({
    configured: () => true,
    persist: async () => {
      throw new Error("Must not be called");
    },
  });
  const oversized = request({ ...input, message: "Ө".repeat(7_000) });
  assert.equal(oversized.headers.has("Content-Length"), false);
  const response = await handler(oversized);
  assert.equal(response.status, 413);
  assert.equal((await response.json()).code, "PAYLOAD_TOO_LARGE");
});

test("missing retry key and invalid JSON fail before attempting persistence", async () => {
  const handler = createInquiryHandler({
    configured: () => true,
    persist: async () => {
      throw new Error("Must not be called");
    },
  });
  assert.equal(
    (await handler(request(input, { "Idempotency-Key": "" }))).status,
    400,
  );
  const malformed = new Request("https://tavantansag.example/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: "{",
  });
  assert.equal((await handler(malformed)).status, 400);
});
