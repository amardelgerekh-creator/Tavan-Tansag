import "server-only";
import { send } from "@vercel/queue";
import { notificationsConfigured, processNotification } from "./notification-service";
import { privateStorageConfigured } from "./inquiry-config";
import { createNotificationConsumer, createNotificationDispatcher, dueNotificationsPipeline } from "./notification-queue-policy";

export const notificationDeliveryConfigured = () => notificationsConfigured() && privateStorageConfigured();

/** Call after the request and its outbox record have committed together. */
export const dispatchNotification = createNotificationDispatcher({ configured: notificationDeliveryConfigured, publish: send });
export const consumeNotification = createNotificationConsumer({ configured: notificationDeliveryConfigured, process: processNotification });

export async function dueNotificationIds(): Promise<unknown> {
  if (!notificationDeliveryConfigured()) return [];
  const { privateFirestore } = await import("./firestore-private");
  const rows = await privateFirestore().pipeline(dueNotificationsPipeline());
  return rows.map(row => row.id);
}
