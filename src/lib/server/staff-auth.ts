import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { staffEmails, staffIdentity } from "./staff-policy";

const keys = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export class StaffAuthError extends Error {
  constructor(public status: number) { super("Staff authentication failed"); }
}

export function staffConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_WEB_API_KEY && process.env.FIREBASE_WEB_APP_ID && staffEmails().length);
}

export async function requireStaff(request: Request) {
  if (!staffConfigured()) throw new StaffAuthError(503);
  const header = request.headers.get("authorization") ?? "";
  if (!/^Bearer [A-Za-z0-9_.-]+$/.test(header) || header.length > 16384) throw new StaffAuthError(401);
  const token = header.slice(7);
  let payload;
  try {
    ({ payload } = await jwtVerify(token, keys, {
      algorithms: ["RS256"],
      audience: process.env.FIREBASE_PROJECT_ID,
      issuer: `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`,
      requiredClaims: ["exp", "iat", "auth_time", "sub"],
    }));
  } catch { throw new StaffAuthError(401); }
  const identity = staffIdentity(payload, staffEmails());
  if (!identity) throw new StaffAuthError(403);
  // Check the current account too: disabled accounts and revoked sessions must
  // not retain CRM access until a previously issued JWT expires.
  let response;
  try {
    response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(process.env.FIREBASE_WEB_API_KEY!)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }), cache: "no-store", signal: AbortSignal.timeout(8000),
    });
  } catch { throw new StaffAuthError(503); }
  if (!response.ok) throw new StaffAuthError(response.status >= 500 ? 503 : 401);
  const body = await response.json();
  const user = body.users?.[0];
  if (!user || user.localId !== identity.uid || user.disabled || user.emailVerified !== true || user.email?.toLowerCase() !== identity.email || Number(user.validSince ?? 0) > Number(payload.auth_time)) throw new StaffAuthError(401);
  return identity;
}
