import { communityPatchSchema } from "@/lib/community-contract";
import { requireStaff } from "@/lib/server/staff-auth";
import { readStaffPatch, staffFailure, staffResponse } from "@/lib/server/staff-http";
import { updateCommunity } from "@/lib/server/community-staff";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff(request);
    const { id } = await context.params;
    const input = communityPatchSchema.safeParse(await readStaffPatch(request));
    if (!input.success) return staffResponse({ code: "INVALID_INPUT" }, 400);
    return staffResponse({ item: await updateCommunity(id, input.data, staff) });
  } catch (error) { return staffFailure(error); }
}
