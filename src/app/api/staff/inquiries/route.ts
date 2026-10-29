import { requireStaff } from "@/lib/server/staff-auth";
import { staffFailure, staffResponse } from "@/lib/server/staff-http";
import { listInquiries } from "@/lib/server/crm";
import { crmStatuses, type CrmStatus } from "@/lib/crm-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const staff = await requireStaff(request);
    const query = new URL(request.url).searchParams;
    const status = query.get("status");
    if (status && !crmStatuses.includes(status as CrmStatus)) return staffResponse({ code: "INVALID_INPUT" }, 400);
    const before = query.get("before") || undefined;
    if (before && before.length > 300) return staffResponse({ code: "INVALID_INPUT" }, 400);
    const result = await listInquiries({ status: status ? status as CrmStatus : undefined, before, limit: 30 });
    return staffResponse({ ...result, staff: { email: staff.email } });
  } catch (error) { return staffFailure(error); }
}
