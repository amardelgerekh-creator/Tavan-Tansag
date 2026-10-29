import type { JWTPayload } from "jose";

export function staffEmails(value = process.env.STAFF_EMAILS ?? ""): string[] {
  return value.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export function staffIdentity(payload: JWTPayload, allowed: string[], now = Date.now() / 1000) {
  const firebase = payload.firebase as { sign_in_provider?: string } | undefined;
  if (
    typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 128 ||
    typeof payload.email !== "string" || payload.email_verified !== true ||
    typeof payload.iat !== "number" || payload.iat > now + 30 ||
    typeof payload.auth_time !== "number" || payload.auth_time > now + 30 ||
    firebase?.sign_in_provider !== "google.com" ||
    !allowed.includes(payload.email.toLowerCase())
  ) return null;
  return { uid: payload.sub, email: payload.email.toLowerCase() };
}
