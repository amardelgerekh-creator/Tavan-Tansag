import { requireStaff } from "@/lib/server/staff-auth";
import { readStaffPatch, staffFailure, staffResponse } from "@/lib/server/staff-http";
import { saveCatalogReview } from "@/lib/server/catalog-review";
import { catalogReviewMutationSchema } from "@/lib/catalog-review-contract";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireStaff(request);
    const { id } = await context.params;
    const parsed = catalogReviewMutationSchema.safeParse(await readStaffPatch(request));
    if (!parsed.success) return staffResponse({ code: "INVALID_INPUT" }, 400);
    return staffResponse({ item: await saveCatalogReview(id, parsed.data, actor) });
  } catch (error) { return staffFailure(error); }
}
