import { createInquiryHandler } from "@/lib/server/inquiry-handler";
import { after } from "next/server";
import { dispatchNotification } from "@/lib/server/notification-queue";
import {
  inquiryStorageConfigured,
  persistInquiry,
} from "@/lib/server/inquiry-service";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = createInquiryHandler({
  configured: inquiryStorageConfigured,
  persist: async (...args) => {
    const result = await persistInquiry(...args);
    if (result.ok && result.notificationId) {
      const id = result.notificationId;
      // A scheduling failure must not erase or contradict the saved request.
      // Its atomic outbox record remains available to the recovery job.
      try { after(async () => { await dispatchNotification(id); }); } catch { /* Recovered from the durable outbox. */ }
    }
    return result;
  },
  allowedOrigin: process.env.SITE_ORIGIN,
});
