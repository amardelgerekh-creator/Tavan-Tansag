import { communityInputSchema, communityKeySchema, type PersistCommunity } from "../community-contract";
import { inquiryClientIp } from "./inquiry-handler";
import { requestOriginAllowed } from "./request-origin";

const MAX_BYTES = 12_000;
function respond(status: number, body: Record<string, unknown>, headers?: Record<string, string>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function createCommunityHandler(options: { configured: () => boolean; persist: PersistCommunity; allowedOrigin?: string }) {
  return async (request: Request): Promise<Response> => {
    if (!requestOriginAllowed(request, options.allowedOrigin, true)) return respond(403, { ok: false, code: "ORIGIN_DENIED" });
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return respond(415, { ok: false, code: "UNSUPPORTED_MEDIA_TYPE" });
    const key = communityKeySchema.safeParse(request.headers.get("idempotency-key"));
    if (!key.success) return respond(400, { ok: false, code: "INVALID_IDEMPOTENCY_KEY" });
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return respond(413, { ok: false, code: "PAYLOAD_TOO_LARGE" });
    let input: unknown;
    try {
      const reader = request.body?.getReader();
      if (!reader) return respond(400, { ok: false, code: "INVALID_JSON" });
      const chunks: Uint8Array[] = []; let bytes = 0;
      for (;;) {
        const part = await reader.read(); if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > MAX_BYTES) { await reader.cancel(); return respond(413, { ok: false, code: "PAYLOAD_TOO_LARGE" }); }
        chunks.push(part.value);
      }
      const merged = new Uint8Array(bytes); let offset = 0;
      for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
      input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(merged));
    } catch { return respond(400, { ok: false, code: "INVALID_JSON" }); }
    const parsed = communityInputSchema.safeParse(input);
    if (!parsed.success) return respond(400, { ok: false, code: "VALIDATION_ERROR", fields: parsed.error.flatten().fieldErrors });
    if (!options.configured()) return respond(503, { ok: false, code: "NOT_CONFIGURED" });
    try {
      const result = await options.persist(parsed.data, key.data, { clientIp: inquiryClientIp(request) });
      // Identical acknowledgement for new, duplicate and previously withdrawn addresses.
      // This is a stored request, never an email-verification or subscription claim.
      if (result.ok) return respond(202, { ok: true, code: "REQUEST_RECEIVED" });
      if (result.code === "RATE_LIMITED") return respond(429, { ok: false, code: result.code }, { "Retry-After": "900" });
      if (result.code === "IDEMPOTENCY_CONFLICT") return respond(409, { ok: false, code: result.code });
      return respond(503, { ok: false, code: "PERSISTENCE_UNAVAILABLE" });
    } catch {
      // Provider failures, request data, addresses and keys never enter logs or responses.
      return respond(503, { ok: false, code: "PERSISTENCE_UNAVAILABLE" });
    }
  };
}
