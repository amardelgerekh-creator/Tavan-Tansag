import { dispatchNotification, dueNotificationIds, notificationDeliveryConfigured } from "@/lib/server/notification-queue";
import { createNotificationReconcileHandler } from "@/lib/server/notification-queue-policy";

export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = createNotificationReconcileHandler({
  secret: () => process.env.CRON_SECRET,
  configured: notificationDeliveryConfigured,
  due: dueNotificationIds,
  dispatch: dispatchNotification,
});
