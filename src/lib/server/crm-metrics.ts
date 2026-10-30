import "server-only";
import { privateFirestore } from "./firestore-private";
import { metricsPipeline } from "./crm-metrics-query";
import { summarizeMetricGroups, type MetricPeriod } from "../crm-metrics-contract";

/** Staff-authorized routes only. Returns aggregates, never customer records. */
export async function getCrmMetrics(days: MetricPeriod) {
  const now = Date.now();
  const rows = await privateFirestore().pipeline(metricsPipeline(days, now));
  return summarizeMetricGroups(rows, days, now);
}
