import "server-only";
import { createNotificationProcessor, validNotificationConfig, type NotificationConfig } from "./notification-engine";
import type { NotificationResult } from "./notification-contract";

function notificationConfig(): NotificationConfig | null {
  if (process.env.NOTIFICATIONS_ENABLED !== "true") return null;
  return { apiKey: process.env.RESEND_API_KEY ?? "", from: process.env.NOTIFICATION_FROM ?? "" };
}

export const notificationsConfigured = () => validNotificationConfig(notificationConfig());
export const customerReceiptsConfigured = () => process.env.CUSTOMER_RECEIPTS_ENABLED === "true" && notificationsConfigured();
export async function processNotification(id: string): Promise<NotificationResult> {
  if (!notificationsConfigured()) return { status: "disabled" };
  if (/^(?:inquiry|community)-receipt-/.test(id) && !customerReceiptsConfigured()) return { status: "disabled" };
  try {
    const { privateFirestore } = await import("./firestore-private");
    return await createNotificationProcessor({ store: privateFirestore(), config: notificationConfig })(id);
  } catch { return { status: "retry", retryAfterSeconds: 60 }; }
}
