import { handleCallback } from "@vercel/queue";
import { consumeNotification } from "@/lib/server/notification-queue";
import { notificationQueueRetry } from "@/lib/server/notification-queue-policy";

export const runtime = "nodejs";
export const maxDuration = 60;

// The queue/v2beta trigger in vercel.json makes this a private Vercel consumer.
export const POST = handleCallback(consumeNotification, { visibilityTimeoutSeconds: 120, retry: notificationQueueRetry });
