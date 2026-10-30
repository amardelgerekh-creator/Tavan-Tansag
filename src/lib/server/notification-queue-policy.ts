import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { notificationCollection, notificationIdSchema, type NotificationResult } from "./notification-contract";

export const notificationTopic = "tavan-notifications";
export const notificationReconcileLimit = 5;
export const notificationMessageSchema = z.object({ id: notificationIdSchema }).strict();
export type NotificationDispatchResult = { status: "queued" | "disabled" | "invalid" | "unavailable" };

export function createNotificationDispatcher(options: {
  configured: () => boolean;
  publish: (topic: string, message: { id: string }, options: { idempotencyKey: string; retentionSeconds: number }) => Promise<unknown>;
}) {
  return async (id: string): Promise<NotificationDispatchResult> => {
    const parsed = notificationIdSchema.safeParse(id);
    if (!parsed.success) return { status: "invalid" };
    if (!options.configured()) return { status: "disabled" };
    try {
      await options.publish(notificationTopic, { id: parsed.data }, { idempotencyKey: parsed.data, retentionSeconds: 86_400 });
      return { status: "queued" };
    } catch {
      // The atomic outbox survives publication failures; daily reconciliation retries it.
      return { status: "unavailable" };
    }
  };
}

export class NotificationRetry extends Error {
  constructor(public readonly afterSeconds: number) { super("Notification processing should be retried."); }
}

export function createNotificationConsumer(options: { configured: () => boolean; process: (id: string) => Promise<NotificationResult> }) {
  return async (message: unknown, metadata: { topicName: string }) => {
    const parsed = notificationMessageSchema.safeParse(message);
    // Poison messages and disabled delivery are acknowledged without reading private data.
    if (!parsed.success || metadata.topicName !== notificationTopic || !options.configured()) return;
    let result: NotificationResult;
    try { result = await options.process(parsed.data.id); }
    catch { throw new NotificationRetry(60); }
    if (result.status === "retry") throw new NotificationRetry(result.retryAfterSeconds);
  };
}

export function notificationQueueRetry(error: unknown, metadata: { deliveryCount: number }) {
  const seconds = error instanceof NotificationRetry ? error.afterSeconds : 30 * 2 ** Math.min(Math.max(metadata.deliveryCount, 1), 7);
  return { afterSeconds: Number.isFinite(seconds) ? Math.min(3600, Math.max(1, Math.ceil(seconds))) : 60 };
}

const field = (name: string) => ({ fieldReferenceValue: name });
const string = (value: string) => ({ stringValue: value });
const fn = (name: string, ...args: unknown[]) => ({ functionValue: { name, args } });
const sort = (name: string) => ({ mapValue: { fields: { expression: field(name), direction: string("ascending") } } });

/** Reads only the explicit outbox, never historical customer requests. */
export function dueNotificationsPipeline(now = Date.now()) {
  const due = new Date(now).toISOString();
  return { structuredPipeline: { pipeline: { stages: [
    { name: "collection", args: [{ referenceValue: `/${notificationCollection}` }] },
    { name: "where", args: [fn("and",
      fn("or", ...["pending", "failed", "sending"].map(status => fn("equal", field("status"), string(status)))),
      fn("less_than_or_equal", field("nextAttemptAt"), string(due)),
    )] },
    { name: "sort", args: [sort("nextAttemptAt"), sort("id")] },
    { name: "limit", args: [{ integerValue: String(notificationReconcileLimit) }] },
    { name: "select", args: [{ mapValue: { fields: { id: field("id") } } }] },
  ] } } };
}

export function notificationCronAuthorized(request: Request, secret: string | undefined): boolean {
  if (!secret || secret.length < 32) return false;
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

const response = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export function createNotificationReconcileHandler(options: {
  secret: () => string | undefined;
  configured: () => boolean;
  due: () => Promise<unknown>;
  dispatch: (id: string) => Promise<NotificationDispatchResult>;
}) {
  return async (request: Request): Promise<Response> => {
    if (!notificationCronAuthorized(request, options.secret())) return response({ error: "Unauthorized" }, 401);
    if (!options.configured()) return response({ status: "disabled", queued: 0 });
    try {
      const ids = z.array(notificationIdSchema).max(notificationReconcileLimit).parse(await options.due());
      if (new Set(ids).size !== ids.length) throw new Error("Invalid outbox result");
      const results = await Promise.allSettled(ids.map(id => options.dispatch(id)));
      const queued = results.filter(result => result.status === "fulfilled" && result.value.status === "queued").length;
      const ok = queued === ids.length;
      return response({ status: ok ? "ok" : "unavailable", considered: ids.length, queued }, ok ? 200 : 503);
    } catch { return response({ error: "Reconciliation unavailable" }, 503); }
  };
}
