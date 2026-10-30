import { requireStaff } from "@/lib/server/staff-auth";
import { staffFailure, staffResponse } from "@/lib/server/staff-http";
import { listCatalogReviews } from "@/lib/server/catalog-review";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { await requireStaff(request); return staffResponse({ items: await listCatalogReviews() }); }
  catch (error) { return staffFailure(error); }
}
