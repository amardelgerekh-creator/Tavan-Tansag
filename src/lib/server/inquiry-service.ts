import type { PersistInquiry } from "./inquiry-contract";

/**
 * Firebase CRM persistence has not been implemented. Keep the form and API
 * closed even if INQUIRIES_ENABLED is accidentally set to true. A future
 * provider must implement storage, access control, abuse protection and
 * idempotency before this availability check can be enabled.
 */
export function inquiryStorageConfigured(): boolean {
  return false;
}

export const persistInquiry: PersistInquiry = async () => ({
  ok: false,
  code: "UNAVAILABLE",
});
