import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalogReviewMutationSchema, initialCatalogReview, missingCatalogRequirements, reviewedPublicProduct } from "../src/lib/catalog-review-contract";
import { publicCatalogProduct } from "../src/lib/server/catalog-reader";
import { CatalogReviewError, saveCatalogReviewWithStore } from "../src/lib/server/catalog-review-engine";
import { decodeFields, PrivateStoreError, type DocumentData, type FirestoreGateway } from "../src/lib/server/firestore-protocol";

const sample = publicCatalogProduct(JSON.parse(readFileSync("data/catalog.json", "utf8"))[0]);
const draft = initialCatalogReview(sample).fields;
const complete = { ...draft, material: "Test material", dimensions: "Test dimensions", condition: "Test condition", informationOwner: "Test reviewer", photoOwner: "Test photographer", evidenceNotes: "Synthetic evidence for an automated test only", availability: "available" as const, priceMode: "inquiry" as const, imageRightsConfirmed: true, distinctItemConfirmed: true, factsConfirmed: true };
const actor = { uid: "test-uid", email: "test@example.invalid" };
function fixture() {
  const rows = new Map<string, DocumentData>([[`catalog_public/${sample.id}`, { ...sample, visibility: "public" }]]);
  let fail = false;
  const store: FirestoreGateway = {
    documentName: (path) => `projects/test/databases/test/documents/${path}`,
    begin: async () => "test-transaction", rollback: async () => {}, pipeline: async () => [],
    readMany: async (paths) => new Map(paths.map((path) => [path, rows.has(path) ? { path, data: structuredClone(rows.get(path)!) } : null])),
    commit: async (writes) => {
      if (fail) throw new PrivateStoreError();
      const next = writes.map((write) => {
        const path = write.update.name.split("/documents/")[1];
        if (write.currentDocument && "exists" in write.currentDocument && rows.has(path) !== write.currentDocument.exists) throw new PrivateStoreError("ABORTED");
        return [path, decodeFields(write.update.fields)] as const;
      });
      for (const [path, data] of next) rows.set(path, data);
    },
  };
  return { rows, store, fail: () => { fail = true; } };
}
test("unknown catalog facts remain blank and publication requires concrete evidence and attestations", () => {
  assert.equal(draft.material, ""); assert.equal(draft.informationOwner, ""); assert.equal(draft.priceMode, "unconfirmed");
  assert.ok(missingCatalogRequirements(draft).includes("imageRightsConfirmed"));
  assert.throws(() => reviewedPublicProduct(sample, draft), /INCOMPLETE/);
  assert.deepEqual(missingCatalogRequirements(complete), []);
  for (const key of ["imageRightsConfirmed", "distinctItemConfirmed", "factsConfirmed"] as const)
    assert.ok(missingCatalogRequirements({ ...complete, [key]: false }).includes(key));
  assert.ok(missingCatalogRequirements({ ...complete, priceMode: "fixed", price: null }).includes("priceMode"));
});
test("review input rejects unknown privilege fields, oversized values and invalid price", () => {
  const value = { action: "save", revision: 0, fields: draft };
  assert.equal(catalogReviewMutationSchema.safeParse(value).success, true);
  for (const invalid of [{ ...value, actorEmail: "owner@example.com" }, { ...value, fields: { ...draft, verificationStatus: "verified" } }, { ...value, fields: { ...draft, price: -1 } }, { ...value, fields: { ...draft, evidenceNotes: "x".repeat(1001) } }])
    assert.equal(catalogReviewMutationSchema.safeParse(invalid).success, false);
});
test("saving a draft writes private revision and audit but leaves public sample unchanged", async () => {
  const f = fixture();
  await saveCatalogReviewWithStore(f.store, sample.id, { action: "save", revision: 0, fields: draft }, actor, [sample.id]);
  assert.equal(f.rows.get(`catalog_public/${sample.id}`)?.publicationStatus, "sample");
  assert.equal(f.rows.get(`catalog_reviews/${sample.id}`)?.revision, 1);
  assert.equal(f.rows.get(`catalog_reviews/${sample.id}/activity/revision-1`)?.actorEmail, actor.email);
});
test("publication atomically records reviewer and emits only public fields, never internal evidence", async () => {
  const f = fixture();
  await saveCatalogReviewWithStore(f.store, sample.id, { action: "publish", revision: 0, fields: complete }, actor, [sample.id]);
  const published = f.rows.get(`catalog_public/${sample.id}`)!;
  assert.equal(published.verificationStatus, "verified"); assert.equal(published.publicationStatus, "published");
  assert.equal(published.priceMode, "inquiry"); assert.equal(published.price, null); assert.equal(published.condition, complete.condition);
  for (const field of ["informationOwner", "photoOwner", "evidenceNotes", "sourceUrl", "factsConfirmed", "updatedBy"])
    assert.equal(field in published, false);
  assert.equal(f.rows.get(`catalog_reviews/${sample.id}`)?.publishedBy, actor.email);
  assert.equal(f.rows.get(`catalog_reviews/${sample.id}`)?.publishedRevision, 1);
});
test("incomplete publish, unknown item and stale revision cannot modify public records", async () => {
  const f = fixture();
  await assert.rejects(() => saveCatalogReviewWithStore(f.store, sample.id, { action: "publish", revision: 0, fields: draft }, actor, [sample.id]), (e) => e instanceof CatalogReviewError && e.code === "INVALID_INPUT");
  await assert.rejects(() => saveCatalogReviewWithStore(f.store, "TT-999", { action: "save", revision: 0, fields: draft }, actor, [sample.id]), (e) => e instanceof CatalogReviewError && e.code === "NOT_FOUND");
  await saveCatalogReviewWithStore(f.store, sample.id, { action: "save", revision: 0, fields: draft }, actor, [sample.id]);
  await assert.rejects(() => saveCatalogReviewWithStore(f.store, sample.id, { action: "publish", revision: 0, fields: complete }, actor, [sample.id]), (e) => e instanceof CatalogReviewError && e.code === "CONFLICT");
  assert.equal(f.rows.get(`catalog_public/${sample.id}`)?.publicationStatus, "sample");
});
test("failed publication commit leaves the public document and reviewer history untouched", async () => {
  const f = fixture(); f.fail();
  await assert.rejects(() => saveCatalogReviewWithStore(f.store, sample.id, { action: "publish", revision: 0, fields: complete }, actor, [sample.id]));
  assert.equal(f.rows.size, 1);
  assert.equal(f.rows.get(`catalog_public/${sample.id}`)?.publicationStatus, "sample");
});
