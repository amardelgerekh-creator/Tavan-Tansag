import "server-only";
import records from "../../../data/catalog.json";
import { catalogReviewRecordSchema, initialCatalogReview, type CatalogReviewItem, type CatalogReviewMutation } from "../catalog-review-contract";
import { publicCatalogProduct } from "./catalog-reader";
import { privateFirestore } from "./firestore-private";
import { CatalogReviewError, saveCatalogReviewWithStore } from "./catalog-review-engine";
import { staffEmails } from "./staff-policy";

const ids = records.map((item) => item.id);
export async function listCatalogReviews(): Promise<CatalogReviewItem[]> {
  try {
    const rows = await privateFirestore().readMany(ids.flatMap((id) => [`catalog_public/${id}`, `catalog_reviews/${id}`]));
    return records.map((source) => {
      const current = rows.get(`catalog_public/${source.id}`);
      if (!current) throw new CatalogReviewError("UNAVAILABLE");
      const product = publicCatalogProduct(current.data);
      const review = rows.get(`catalog_reviews/${source.id}`);
      return { product, review: review ? catalogReviewRecordSchema.parse(review.data) : initialCatalogReview(product), source: { url: source.sourceUrl, fileName: source.sourceFileName } };
    });
  } catch { throw new CatalogReviewError("UNAVAILABLE"); }
}
export async function saveCatalogReview(id: string, input: CatalogReviewMutation, actor: { uid: string; email: string }) {
  if (!staffEmails().includes(actor.email.toLowerCase())) throw new CatalogReviewError("INVALID_INPUT");
  return saveCatalogReviewWithStore(privateFirestore(), id, input, actor, ids);
}
