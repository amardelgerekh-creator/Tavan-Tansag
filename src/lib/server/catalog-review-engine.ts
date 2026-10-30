import { catalogReviewMutationSchema, catalogReviewRecordSchema, initialCatalogReview, missingCatalogRequirements, reviewedPublicProduct, type CatalogReviewMutation } from "../catalog-review-contract";
import { publicCatalogProduct } from "./catalog-reader";
import { documentWrite, PrivateStoreError, type FirestoreGateway } from "./firestore-protocol";

export class CatalogReviewError extends Error {
  constructor(public code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "UNAVAILABLE") { super("Catalog review could not be completed."); }
}

export async function saveCatalogReviewWithStore(store: FirestoreGateway, id: string, raw: CatalogReviewMutation, actor: { uid: string; email: string }, allowedIds: readonly string[]) {
  const parsed = catalogReviewMutationSchema.safeParse(raw);
  if (!allowedIds.includes(id) || !/^TT-\d{3,6}$/.test(id)) throw new CatalogReviewError("NOT_FOUND");
  if (!parsed.success || !actor.uid || !actor.email) throw new CatalogReviewError("INVALID_INPUT");
  const input = parsed.data;
  if (input.action === "publish" && missingCatalogRequirements(input.fields).length) throw new CatalogReviewError("INVALID_INPUT");
  const reviewPath = `catalog_reviews/${id}`;
  const productPath = `catalog_public/${id}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    let transaction: string | undefined; let committed = false;
    try {
      transaction = await store.begin();
      const rows = await store.readMany([reviewPath, productPath], transaction);
      const productDoc = rows.get(productPath);
      if (!productDoc) throw new CatalogReviewError("NOT_FOUND");
      const product = publicCatalogProduct(productDoc.data);
      if (product.id !== id) throw new CatalogReviewError("INVALID_INPUT");
      const reviewDoc = rows.get(reviewPath);
      const current = reviewDoc ? catalogReviewRecordSchema.parse(reviewDoc.data) : initialCatalogReview(product);
      if (current.revision !== input.revision) throw new CatalogReviewError("CONFLICT");
      const now = new Date().toISOString();
      const revision = current.revision + 1;
      const publishing = input.action === "publish";
      const next = {
        fields: input.fields, revision, updatedAt: now, updatedBy: actor.email,
        publishedAt: publishing ? now : current.publishedAt,
        publishedBy: publishing ? actor.email : current.publishedBy,
        publishedRevision: publishing ? revision : current.publishedRevision,
      };
      const published = publishing ? reviewedPublicProduct(product, input.fields) : null;
      const writes = [
        documentWrite(store, reviewPath, next, { exists: Boolean(reviewDoc) }),
        documentWrite(store, `${reviewPath}/activity/revision-${revision}`, {
          kind: input.action, at: now, actorUid: actor.uid, actorEmail: actor.email, revision,
          fields: input.fields,
        }, { exists: false }),
        ...(published ? [documentWrite(store, productPath, { ...published }, { exists: true })] : []),
      ];
      await store.commit(writes, transaction); committed = true;
      return { product: published ? publicCatalogProduct(published) : product, review: next };
    } catch (error) {
      if (error instanceof CatalogReviewError) throw error;
      if (!(error instanceof PrivateStoreError) || error.code !== "ABORTED" || attempt === 3) throw new CatalogReviewError("UNAVAILABLE");
    } finally { if (transaction && !committed) await store.rollback(transaction).catch(() => undefined); }
  }
  throw new CatalogReviewError("UNAVAILABLE");
}
