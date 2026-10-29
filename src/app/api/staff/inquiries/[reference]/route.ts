import { requireStaff } from "@/lib/server/staff-auth";
import { readStaffPatch, staffFailure, staffResponse } from "@/lib/server/staff-http";
import { updateInquiry } from "@/lib/server/crm";
import { crmPatchSchema } from "@/lib/crm-contract";

export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ reference: string }> }) {
  try {
    const staff = await requireStaff(request);
    const { reference } = await context.params;
    const parsed = crmPatchSchema.safeParse(await readStaffPatch(request));
    if (!parsed.success) return staffResponse({ code: "INVALID_INPUT" }, 400);
    const item = await updateInquiry(reference, parsed.data, staff);
    return staffResponse({ item });
  } catch (error) { return staffFailure(error); }
}
