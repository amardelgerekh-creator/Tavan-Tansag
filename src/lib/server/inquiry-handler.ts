import {
  idempotencyKeySchema,
  inquirySchema,
  type PersistInquiry,
} from "./inquiry-contract";
import { isIP } from "node:net";

const MAX_BYTES = 12_000;

export function inquiryClientIp(request: Request, vercel = process.env.VERCEL === "1"): string {
  // Vercel replaces this header at its edge. Never trust client X-Forwarded-For.
  const value = vercel ? request.headers.get("x-vercel-forwarded-for")?.trim() : null;
  return value && isIP(value) ? value : "unidentified";
}

function respond(
  status: number,
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

/** Kept dependency-injected so failure semantics can be exercised without live credentials. */
export function createInquiryHandler(options: {
  configured: () => boolean;
  persist: PersistInquiry;
  allowedOrigin?: string;
}) {
  return async function handleInquiry(request: Request): Promise<Response> {
    const requestOrigin = request.headers.get("origin");
    const expectedOrigin = options.allowedOrigin ?? new URL(request.url).origin;
    if (requestOrigin && requestOrigin !== expectedOrigin) {
      return respond(403, { ok: false, code: "ORIGIN_DENIED" });
    }
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    ) {
      return respond(415, { ok: false, code: "UNSUPPORTED_MEDIA_TYPE" });
    }

    const key = idempotencyKeySchema.safeParse(
      request.headers.get("idempotency-key"),
    );
    if (!key.success)
      return respond(400, { ok: false, code: "INVALID_IDEMPOTENCY_KEY" });
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
      return respond(413, { ok: false, code: "PAYLOAD_TOO_LARGE" });
    }

    let input: unknown;
    try {
      // Bound the stream itself, including requests with no Content-Length header.
      const reader = request.body?.getReader();
      if (!reader) return respond(400, { ok: false, code: "INVALID_JSON" });
      let bytes = 0;
      const chunks: Uint8Array[] = [];
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > MAX_BYTES) {
          await reader.cancel();
          return respond(413, { ok: false, code: "PAYLOAD_TOO_LARGE" });
        }
        chunks.push(part.value);
      }
      const merged = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      input = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(merged),
      );
    } catch {
      return respond(400, { ok: false, code: "INVALID_JSON" });
    }

    const parsed = inquirySchema.safeParse(input);
    if (!parsed.success) {
      return respond(400, {
        ok: false,
        code: "VALIDATION_ERROR",
        fields: parsed.error.flatten().fieldErrors,
      });
    }
    if (!options.configured()) {
      return respond(503, {
        ok: false,
        code: "NOT_CONFIGURED",
        message:
          "Online inquiries are not connected yet. Please contact the store directly.",
      });
    }

    try {
      const result = await options.persist(parsed.data, key.data, { clientIp: inquiryClientIp(request) });
      if (result.ok) {
        return respond(result.duplicate ? 200 : 201, {
          ok: true,
          reference: result.reference,
        });
      }
      if (result.code === "RATE_LIMITED") {
        return respond(
          429,
          { ok: false, code: result.code },
          { "Retry-After": "900" },
        );
      }
      if (result.code === "IDEMPOTENCY_CONFLICT")
        return respond(409, { ok: false, code: result.code });
      if (result.code === "UNKNOWN_PRODUCT")
        return respond(400, { ok: false, code: result.code });
      return respond(503, { ok: false, code: "PERSISTENCE_UNAVAILABLE" });
    } catch {
      // Never log request content, contact details, keys, or provider error payloads.
      return respond(503, { ok: false, code: "PERSISTENCE_UNAVAILABLE" });
    }
  };
}
