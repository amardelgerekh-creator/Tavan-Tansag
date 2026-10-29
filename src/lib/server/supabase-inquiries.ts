import "server-only";
import { createHash, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeContact,
  type InquiryInput,
  type PersistenceResult,
} from "./inquiry-contract";

export function inquiryStorageConfigured(): boolean {
  return (
    process.env.INQUIRIES_ENABLED === "true" &&
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
    )
  );
}

export async function persistInquiry(
  input: InquiryInput,
  idempotencyKey: string,
): Promise<PersistenceResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!inquiryStorageConfigured() || !url || !key)
    return { ok: false, code: "UNAVAILABLE" };

  const normalized = {
    ...input,
    contactValue: normalizeContact(input),
    website: undefined,
  };
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
  const rateKey = createHmac("sha256", key)
    .update(`${input.contactMethod}:${normalized.contactValue}`)
    .digest("hex");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .rpc("submit_inquiry", {
      p_name: normalized.name,
      p_contact_method: normalized.contactMethod,
      p_contact_value: normalized.contactValue,
      p_message: normalized.message,
      p_locale: normalized.locale,
      p_product_code: normalized.productId ?? null,
      p_idempotency_key: idempotencyKey,
      p_fingerprint: fingerprint,
      p_rate_key: rateKey,
    })
    .abortSignal(AbortSignal.timeout(8_000));
  if (error) {
    if (error.code === "P0001" && error.message === "rate_limited")
      return { ok: false, code: "RATE_LIMITED" };
    if (error.code === "22023" && error.message === "idempotency_conflict")
      return { ok: false, code: "IDEMPOTENCY_CONFLICT" };
    if (error.code === "22023" && error.message === "unknown_product")
      return { ok: false, code: "UNKNOWN_PRODUCT" };
    return { ok: false, code: "UNAVAILABLE" };
  }
  if (
    !data ||
    typeof data.reference !== "string" ||
    typeof data.duplicate !== "boolean"
  ) {
    return { ok: false, code: "UNAVAILABLE" };
  }
  return { ok: true, reference: data.reference, duplicate: data.duplicate };
}
