import { metricsWindow, type MetricPeriod } from "../crm-metrics-contract";

const field = (name: string) => ({ fieldReferenceValue: name });
const string = (value: string) => ({ stringValue: value });
const fn = (name: string, ...args: unknown[]) => ({ functionValue: { name, args } });
const equal = (name: string, value: string) => fn("equal", field(name), string(value));

/** One snapshot query, with filtering and counting performed in Firestore Enterprise.
 * Aggregate protocol: official SDK Aggregate._toProto emits accumulators then groups.
 * https://firebase.google.com/docs/firestore/pipelines/stages/transformation/aggregate
 */
export function metricsPipeline(days: MetricPeriod, now: number) {
  const { from, through } = metricsWindow(days, now);
  const followUpState = fn("conditional",
    fn("or", equal("status", "closed"), equal("status", "won"), fn("equal", field("followUpAt"), { nullValue: null })),
    string("none"),
    fn("conditional", fn("less_than_or_equal", field("followUpAt"), string(through)), string("overdue"), string("scheduled")),
  );
  return { structuredPipeline: { pipeline: { stages: [
    { name: "collection", args: [{ referenceValue: "/inquiries" }] },
    { name: "where", args: [fn("and", fn("greater_than_or_equal", field("createdAt"), string(from)), fn("less_than_or_equal", field("createdAt"), string(through)))] },
    { name: "aggregate", args: [
      { mapValue: { fields: { count: fn("count") } } },
      { mapValue: { fields: { productId: field("productId"), locale: field("locale"), status: field("status"), followUpState } } },
    ] },
    // This limits groups after counting all matching records, never the input enquiries.
    // The extra group is a sentinel; oversized results fail rather than show partial totals.
    { name: "limit", args: [{ integerValue: "4097" }] },
  ] } } };
}
