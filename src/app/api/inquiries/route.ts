import { createInquiryHandler } from "@/lib/server/inquiry-handler";
import {
  inquiryStorageConfigured,
  persistInquiry,
} from "@/lib/server/inquiry-service";

export const runtime = "nodejs";

export const POST = createInquiryHandler({
  configured: inquiryStorageConfigured,
  persist: persistInquiry,
  allowedOrigin: process.env.SITE_ORIGIN,
});
