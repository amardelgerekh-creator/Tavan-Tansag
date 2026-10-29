import type { PersistInquiry } from "./inquiry-contract";
import { intakeConfigured, defaultAssignee } from "./inquiry-config";
import { createInquiryPersistence } from "./inquiry-persistence";

export function inquiryStorageConfigured(): boolean {
  return intakeConfigured();
}

export const persistInquiry: PersistInquiry = async (input, key, context) => {
  if (!intakeConfigured()) return { ok: false, code: "UNAVAILABLE" };
  try {
    const { privateFirestore } = await import("./firestore-private");
    return await createInquiryPersistence({
      store: privateFirestore(),
      hashSecret: process.env.INQUIRY_HASH_SECRET!,
      assignee: defaultAssignee(),
      includeSamples: process.env.CATALOG_INCLUDE_SAMPLES === "true",
    })(input, key, context);
  } catch {
    return { ok: false, code: "UNAVAILABLE" };
  }
};
