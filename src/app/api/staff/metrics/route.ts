import { requireStaff } from "@/lib/server/staff-auth";
import { staffFailure, staffResponse } from "@/lib/server/staff-http";
import { getCrmMetrics } from "@/lib/server/crm-metrics";
import type { MetricPeriod } from "@/lib/crm-metrics-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    await requireStaff(request);
    const query = new URL(request.url).searchParams;
    const days = query.get("days") ?? "30";
    if (!["7", "30", "90"].includes(days) || query.getAll("days").length > 1 || [...query.keys()].some((key) => key !== "days")) {
      return staffResponse({ code: "INVALID_INPUT" }, 400);
    }
    return staffResponse({ metrics: await getCrmMetrics(Number(days) as MetricPeriod) });
  } catch (error) { return staffFailure(error); }
}
