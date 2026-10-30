import { test } from "node:test";
import assert from "node:assert/strict";
import { metricsWindow, summarizeMetricGroups } from "../src/lib/crm-metrics-contract";
import { metricsPipeline } from "../src/lib/server/crm-metrics-query";

const now = Date.parse("2026-10-30T02:00:00.000Z");
test("metric periods are rolling UTC bounds and reject unsupported periods", () => {
  assert.deepEqual(metricsWindow(7, now), { days: 7, from: "2026-10-23T02:00:00.000Z", through: "2026-10-30T02:00:00.000Z" });
  assert.equal(metricsWindow(30, now).from, "2026-09-30T02:00:00.000Z");
  assert.equal(metricsWindow(90, now).from, "2026-08-01T02:00:00.000Z");
  assert.throws(() => metricsWindow(31 as 30, now));
  assert.throws(() => metricsWindow(7, NaN));
});

test("metrics count grouped enquiries beyond a page and retain general and bilingual requests", () => {
  const data = summarizeMetricGroups([
    { productId: "TT-001", locale: "mn", status: "new", followUpState: "none", count: 1000 },
    { productId: "TT-001", locale: "en", status: "contacted", followUpState: "overdue", count: 3 },
    { productId: "TT-001", locale: "mn", status: "won", followUpState: "none", count: 2 },
    { productId: null, locale: "en", status: "consultation", followUpState: "scheduled", count: 4 },
    { productId: "TT-006", locale: "mn", status: "closed", followUpState: "none", count: 5 },
  ], 30, now);
  assert.equal(data.total, 1014);
  assert.equal(data.open, 1007);
  assert.equal(data.won, 2);
  assert.equal(data.overdue, 3);
  assert.equal(data.scheduled, 4);
  assert.deepEqual(data.byLocale, { mn: 1007, en: 7 });
  assert.deepEqual(data.products[0], { productId: "TT-001", inquiries: 1005, open: 1003, won: 2, mn: 1002, en: 3 });
  assert.equal(data.products.find((product) => product.productId === null)?.inquiries, 4);
  assert.equal(Object.values(data.byStatus).reduce((sum, count) => sum + count, 0), data.total);
});

test("zero activity is an honest empty result; malformed and truncated aggregates fail closed", () => {
  const empty = summarizeMetricGroups([], 7, now);
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.products, []);
  const row = { productId: null, locale: "mn", status: "new", followUpState: "none", count: 1 };
  assert.throws(() => summarizeMetricGroups([{ ...row, count: -1 }], 7, now));
  assert.throws(() => summarizeMetricGroups([{ ...row, name: "Customer name must never return" }], 7, now));
  assert.throws(() => summarizeMetricGroups([{ ...row, status: "won", followUpState: "overdue" }], 7, now));
  assert.throws(() => summarizeMetricGroups(Array(4097).fill(row), 7, now));
});

test("database aggregates before limiting and filters both edges of the selected period", () => {
  const stages = metricsPipeline(7, now).structuredPipeline.pipeline.stages;
  assert.deepEqual(stages.map((stage) => stage.name), ["collection", "where", "aggregate", "limit"]);
  const query = JSON.stringify(stages);
  assert.ok(query.includes("2026-10-23T02:00:00.000Z") && query.includes("2026-10-30T02:00:00.000Z"));
  assert.ok(query.includes("greater_than_or_equal") && query.includes("less_than_or_equal"));
  assert.ok(!query.includes("contactValue") && !query.includes("notes") && !query.includes("actor"));
});
