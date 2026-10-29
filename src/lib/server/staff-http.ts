import { StaffAuthError } from "./staff-auth";

export function staffResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", Vary: "Authorization" } });
}

export function staffFailure(error: unknown) {
  if (error instanceof StaffAuthError) return staffResponse({ code: error.status === 403 ? "FORBIDDEN" : error.status === 401 ? "UNAUTHORIZED" : "UNAVAILABLE" }, error.status);
  const code = error && typeof error === "object" && "code" in error ? error.code : "UNAVAILABLE";
  const status = code === "CONFLICT" ? 409 : code === "NOT_FOUND" ? 404 : code === "INVALID_INPUT" ? 400 : 503;
  return staffResponse({ code: typeof code === "string" && ["CONFLICT", "NOT_FOUND", "INVALID_INPUT"].includes(code) ? code : "UNAVAILABLE" }, status);
}

export async function readStaffPatch(request: Request) {
  if (request.headers.get("origin") !== (process.env.SITE_ORIGIN ?? new URL(request.url).origin)) throw new StaffAuthError(403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw Object.assign(new Error(), { code: "INVALID_INPUT" });
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(new Error(), { code: "INVALID_INPUT" });
  const chunks: Uint8Array[] = []; let length = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > 12000) { await reader.cancel(); throw Object.assign(new Error(), { code: "INVALID_INPUT" }); }
    chunks.push(value);
  }
  const result = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(result)); }
  catch { throw Object.assign(new Error(), { code: "INVALID_INPUT" }); }
}
