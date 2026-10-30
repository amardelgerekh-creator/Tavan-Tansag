import { z } from "zod";
import { crmStatuses } from "./crm-contract";

export const metricPeriods = [7, 30, 90] as const;
export type MetricPeriod = typeof metricPeriods[number];
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const countsByStatus = z.object({ new: count, contacted: count, consultation: count, quoted: count, won: count, closed: count }).strict();
export const crmMetricsSchema = z.object({
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  from: z.iso.datetime(), through: z.iso.datetime(),
  total: count, open: count, won: count, overdue: count, scheduled: count,
  byStatus: countsByStatus,
  byLocale: z.object({ mn: count, en: count }).strict(),
  products: z.array(z.object({
    productId: z.string().regex(/^TT-\d{3,}$/).nullable(),
    inquiries: count, open: count, won: count, mn: count, en: count,
  }).strict()).max(4096),
}).strict();
export type CrmMetricsData = z.infer<typeof crmMetricsSchema>;
export const metricGroupSchema = z.object({
  productId: z.string().regex(/^TT-\d{3,}$/).nullable(),
  locale: z.enum(["mn", "en"]), status: z.enum(crmStatuses),
  followUpState: z.enum(["none", "overdue", "scheduled"]), count: count.positive(),
}).strict();

export function metricsWindow(days: MetricPeriod, now: number) {
  if (!metricPeriods.includes(days) || !Number.isFinite(now)) throw new Error("INVALID_METRICS_WINDOW");
  return { days, from: new Date(now - days * 86_400_000).toISOString(), through: new Date(now).toISOString() };
}

/** Combines already-aggregated database groups; never accepts customer/contact data. */
export function summarizeMetricGroups(rows: unknown[], days: MetricPeriod, now: number): CrmMetricsData {
  if (rows.length > 4096) throw new Error("METRICS_GROUP_LIMIT");
  const result: CrmMetricsData = {
    ...metricsWindow(days, now), total: 0, open: 0, won: 0, overdue: 0, scheduled: 0,
    byStatus: { new: 0, contacted: 0, consultation: 0, quoted: 0, won: 0, closed: 0 },
    byLocale: { mn: 0, en: 0 }, products: [],
  };
  const products = new Map<string | null, CrmMetricsData["products"][number]>();
  for (const raw of rows) {
    const row = metricGroupSchema.parse(raw);
    const active = row.status !== "closed" && row.status !== "won";
    if (!active && row.followUpState !== "none") throw new Error("INVALID_FOLLOWUP_GROUP");
    result.total += row.count;
    result.byStatus[row.status] += row.count;
    result.byLocale[row.locale] += row.count;
    if (active) result.open += row.count;
    if (row.status === "won") result.won += row.count;
    if (row.followUpState === "overdue") result.overdue += row.count;
    if (row.followUpState === "scheduled") result.scheduled += row.count;
    const product = products.get(row.productId) ?? { productId: row.productId, inquiries: 0, open: 0, won: 0, mn: 0, en: 0 };
    product.inquiries += row.count;
    product[row.locale] += row.count;
    if (active) product.open += row.count;
    if (row.status === "won") product.won += row.count;
    products.set(row.productId, product);
  }
  result.products = [...products.values()].sort((a, b) => b.inquiries - a.inquiries || (a.productId ?? "").localeCompare(b.productId ?? ""));
  return crmMetricsSchema.parse(result);
}
