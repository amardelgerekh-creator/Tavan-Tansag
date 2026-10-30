import type { PersistCommunity } from "../community-contract";
import { intakeConfigured } from "./inquiry-config";
import { createCommunityPersistence } from "./community-persistence";

export const communityStorageConfigured = () => intakeConfigured();
export const persistCommunity: PersistCommunity = async (input, key, context) => {
  if (!communityStorageConfigured()) return { ok: false, code: "UNAVAILABLE" };
  try {
    const [{ privateFirestore }, { notificationsConfigured, customerReceiptsConfigured }] = await Promise.all([
      import("./firestore-private"),
      import("./notification-service"),
    ]);
    return await createCommunityPersistence({ store: privateFirestore(), hashSecret: process.env.INQUIRY_HASH_SECRET!, notificationsEnabled: notificationsConfigured(), customerReceiptsEnabled: customerReceiptsConfigured() })(input, key, context);
  } catch { return { ok: false, code: "UNAVAILABLE" }; }
};
