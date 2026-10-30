import { createCommunityHandler } from "@/lib/server/community-handler";
import { communityStorageConfigured, persistCommunity } from "@/lib/server/community-service";
import { after } from "next/server";
import { dispatchNotification } from "@/lib/server/notification-queue";

export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = createCommunityHandler({
  configured: communityStorageConfigured,
  persist: async (...args) => {
    const result = await persistCommunity(...args);
    if (result.ok && result.notificationId) {
      const id = result.notificationId;
      try { after(async () => { await dispatchNotification(id); }); } catch { /* The durable outbox permits recovery. */ }
    }
    return result;
  },
  allowedOrigin: process.env.SITE_ORIGIN,
});
