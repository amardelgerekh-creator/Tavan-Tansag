import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import {
  createNotificationConsumer, createNotificationDispatcher, createNotificationReconcileHandler,
  dueNotificationsPipeline, notificationCronAuthorized, notificationMessageSchema,
  notificationQueueRetry, NotificationRetry, notificationTopic,
} from "../src/lib/server/notification-queue-policy";
import type { NotificationResult } from "../src/lib/server/notification-contract";

const inquiry = "inquiry-TT-0123456789ABCDEF0123";
const community = `community-CM-${"a".repeat(64)}`;
const secret = "test-only-cron-secret-with-32-characters";
const request = (authorization?: string) => new Request("https://example.invalid/api/cron/notifications", { headers: authorization === undefined ? {} : { authorization } });

test("queue publication accepts only a validated system ID and safely gates missing configuration", async () => {
  const calls: unknown[][] = [];
  let enabled = false;
  const publish = createNotificationDispatcher({ configured: () => enabled, publish: async (...args) => { calls.push(args); } });
  assert.deepEqual(await publish(inquiry), { status: "disabled" });
  enabled = true;
  assert.deepEqual(await publish("../inquiries/customer"), { status: "invalid" });
  assert.equal(calls.length, 0);
  assert.deepEqual(await publish(inquiry), { status: "queued" });
  assert.deepEqual(calls, [[notificationTopic, { id: inquiry }, { idempotencyKey: inquiry, retentionSeconds: 86_400 }]]);
  const unavailable = createNotificationDispatcher({ configured: () => true, publish: async () => { throw new Error("provider token: do not leak"); } });
  assert.deepEqual(await unavailable(community), { status: "unavailable" });
});

test("worker rejects poison payloads, extra customer fields and a foreign topic without processing", async () => {
  let processed = 0;
  const consume = createNotificationConsumer({ configured: () => true, process: async () => { processed++; return { status: "accepted" }; } });
  for (const payload of [null, inquiry, { id: "invalid" }, { id: inquiry, email: "private@example.invalid" }, { id: community, message: "private" }]) {
    assert.equal(notificationMessageSchema.safeParse(payload).success, false);
    await consume(payload, { topicName: notificationTopic });
  }
  await consume({ id: inquiry }, { topicName: "another-topic" });
  assert.equal(processed, 0);
  await consume({ id: inquiry }, { topicName: notificationTopic });
  assert.equal(processed, 1);
});

test("worker acknowledges disabled and terminal states while scheduling retryable failures", async () => {
  let processed = 0;
  const disabled = createNotificationConsumer({ configured: () => false, process: async () => { processed++; return { status: "accepted" }; } });
  await disabled({ id: inquiry }, { topicName: notificationTopic });
  assert.equal(processed, 0);
  for (const status of ["accepted", "done", "disabled", "review"] as const) {
    await createNotificationConsumer({ configured: () => true, process: async () => ({ status }) })({ id: inquiry }, { topicName: notificationTopic });
  }
  const retry = createNotificationConsumer({ configured: () => true, process: async (): Promise<NotificationResult> => ({ status: "retry", retryAfterSeconds: 120 }) });
  await assert.rejects(retry({ id: inquiry }, { topicName: notificationTopic }), error => {
    assert.deepEqual(notificationQueueRetry(error, { deliveryCount: 1 }), { afterSeconds: 120 });
    return true;
  });
  const throws = createNotificationConsumer({ configured: () => true, process: async () => { throw new Error("private provider payload"); } });
  await assert.rejects(throws({ id: inquiry }, { topicName: notificationTopic }), error => error instanceof NotificationRetry && !error.message.includes("private"));
  assert.deepEqual(notificationQueueRetry(new NotificationRetry(Infinity), { deliveryCount: 1 }), { afterSeconds: 60 });
  assert.deepEqual(notificationQueueRetry(new Error(), { deliveryCount: 1000 }), { afterSeconds: 3600 });
});

test("cron authenticates the exact bearer secret before any configuration or outbox access", async () => {
  let touched = 0;
  const handler = createNotificationReconcileHandler({ secret: () => secret, configured: () => { touched++; return true; }, due: async () => { touched++; return []; }, dispatch: async () => { touched++; return { status: "queued" }; } });
  for (const auth of [undefined, "", secret, `Bearer ${secret}x`, `bearer ${secret}`, `Bearer ${"x".repeat(secret.length)}`]) {
    assert.equal((await handler(request(auth))).status, 401);
  }
  assert.equal(touched, 0);
  assert.equal(notificationCronAuthorized(request("Bearer short"), "short"), false);
  assert.equal(notificationCronAuthorized(request("Bearer undefined"), undefined), false);
  assert.equal(notificationCronAuthorized(request(`Bearer ${secret}`), secret), true);
});

test("disabled cron does not query or enqueue and never caches its response", async () => {
  const handler = createNotificationReconcileHandler({ secret: () => secret, configured: () => false, due: async () => { assert.fail("disabled cron read outbox"); }, dispatch: async () => { assert.fail("disabled cron enqueued a message"); } });
  const result = await handler(request(`Bearer ${secret}`));
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.deepEqual(await result.json(), { status: "disabled", queued: 0 });
});

test("actual cron route rejects public requests and safely skips work before Resend is enabled", () => {
  const moduleUrl = new URL("../src/app/api/cron/notifications/route.ts", import.meta.url).href;
  const script = `import assert from 'node:assert/strict';
    import {GET,maxDuration} from ${JSON.stringify(moduleUrl)};
    process.env.CRON_SECRET=${JSON.stringify(secret)};
    process.env.NOTIFICATIONS_ENABLED='false';
    const request=authorization=>new Request('https://example.invalid/api/cron/notifications',{headers:authorization?{authorization}:{}});
    assert.equal(maxDuration,60);
    assert.equal((await GET(request())).status,401);
    const response=await GET(request('Bearer '+process.env.CRON_SECRET));
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{status:'disabled',queued:0});`;
  execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e", script], { stdio: "pipe" });
});

test("reconciliation bounds the entire batch before sending and returns no customer data or IDs", async () => {
  const sent: string[] = [];
  let ids: unknown = Array(6).fill(inquiry);
  const handler = createNotificationReconcileHandler({ secret: () => secret, configured: () => true, due: async () => ids, dispatch: async id => { sent.push(id); return { status: id === inquiry ? "queued" : "unavailable" }; } });
  for (const invalid of [ids, [inquiry, inquiry], [inquiry, "private@example.invalid"]]) {
    ids = invalid;
    assert.equal((await handler(request(`Bearer ${secret}`))).status, 503);
    assert.equal(sent.length, 0);
  }
  ids = [inquiry, community];
  const response = await handler(request(`Bearer ${secret}`));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "unavailable", considered: 2, queued: 1 });
  assert.deepEqual(sent, [inquiry, community]);
});

test("fallback only queries due nonterminal outbox records, oldest first, selecting five IDs", () => {
  const now = Date.parse("2026-10-30T10:00:00.000Z");
  const { stages } = dueNotificationsPipeline(now).structuredPipeline.pipeline;
  assert.deepEqual(stages[0], { name: "collection", args: [{ referenceValue: "/notification_outbox" }] });
  const filters = JSON.stringify(stages[1]);
  for (const status of ["pending", "failed", "sending"]) assert.ok(filters.includes(status));
  for (const status of ["accepted", "review"]) assert.ok(!filters.includes(status));
  assert.ok(filters.includes("nextAttemptAt"));
  assert.ok(filters.includes("less_than_or_equal"));
  assert.ok(filters.includes("2026-10-30T10:00:00.000Z"));
  assert.deepEqual(stages.at(-2), { name: "limit", args: [{ integerValue: "5" }] });
  assert.deepEqual(stages.at(-1), { name: "select", args: [{ mapValue: { fields: { id: { fieldReferenceValue: "id" } } } }] });
});
