import { communityStatuses, type CommunityStatus } from "@/lib/community-contract";
import { requireStaff } from "@/lib/server/staff-auth";
import { staffFailure, staffResponse } from "@/lib/server/staff-http";
import { listCommunity } from "@/lib/server/community-staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const staff = await requireStaff(request);
    const query = new URL(request.url).searchParams;
    if ([...query.keys()].some(key => !["status", "before"].includes(key) || query.getAll(key).length !== 1)) return staffResponse({ code: "INVALID_INPUT" }, 400);
    const status = query.get("status"), before = query.get("before");
    if ((status !== null && !communityStatuses.includes(status as CommunityStatus)) || (before !== null && (!before || before.length > 512))) return staffResponse({ code: "INVALID_INPUT" }, 400);
    return staffResponse(await listCommunity({ status: status ? status as CommunityStatus : undefined, before: before ?? undefined, limit: 30 }, staff));
  } catch (error) { return staffFailure(error); }
}
