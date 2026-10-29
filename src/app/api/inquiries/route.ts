import { createInquiryHandler } from "@/lib/server/inquiry-handler";
import {
  inquiryStorageConfigured,
  persistInquiry,
} from "@/lib/server/supabase-inquiries";

export const runtime = "nodejs";

export const POST = createInquiryHandler({
  configured: inquiryStorageConfigured,
  persist: persistInquiry,
  allowedOrigin: process.env.SITE_ORIGIN,
});
