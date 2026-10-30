import { createCommunityHandler } from "@/lib/server/community-handler";
import { communityStorageConfigured, persistCommunity } from "@/lib/server/community-service";

export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = createCommunityHandler({ configured: communityStorageConfigured, persist: persistCommunity, allowedOrigin: process.env.SITE_ORIGIN });
