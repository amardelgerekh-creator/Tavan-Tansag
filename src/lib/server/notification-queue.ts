import "server-only";
import { send } from "@vercel/queue";
import { customerReceiptsConfigured, notificationsConfigured, processNotification } from "./notification-service";
import { privateStorageConfigured } from "./inquiry-config";
import { createNotificationConsumer, createNotificationDispatcher, dueNotificationsPipeline, isReceiptNotificationId } from "./notification-queue-policy";

export const notificationDeliveryConfigured = () => notificationsConfigured() && privateStorageConfigured();

/** Call after the request and its outbox record have committed together. */
export const dispatchNotification = createNotificationDispatcher({
  configured: notificationDeliveryConfigured,
  canDispatch: id => !isReceiptNotificationId(id) || customerReceiptsConfigured(),
  publish: send,
});
export const consumeNotification = createNotificationConsumer({ configured: notificationDeliveryConfigured, process: processNotification });

export async function dueNotificationIds(): Promise<unknown> {
  if (!notificationDeliveryConfigured()) return [];
  const { privateFirestore } = await import("./firestore-private");
  const rows = await privateFirestore().pipeline(dueNotificationsPipeline(Date.now(), customerReceiptsConfigured()));
  return rows.map(row => row.id);
}
