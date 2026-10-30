import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { categories, categoryIds, subcategories, isSubcategory, type Category } from "../src/lib/catalog";
import { publicCatalogProduct } from "../src/lib/server/catalog-reader";
import { catalogReviewMutationSchema, catalogReviewRecordSchema, initialCatalogReview, missingCatalogRequirements, reviewedPublicProduct } from "../src/lib/catalog-review-contract";

const raw = JSON.parse(readFileSync("data/catalog.json", "utf8"));
const product = publicCatalogProduct(raw[0]);
test("taxonomy has exactly five ordered parent categories and their bilingual children", () => {
  assert.deepEqual(categoryIds, ["men", "women", "silverware", "horse", "snuff-bottles"]);
  assert.deepEqual(Object.keys(categories), [...categoryIds]);
  assert.deepEqual(Object.keys(subcategories), [...categoryIds]);
  const children = {
    men: ["belts", "rings", "knives", "firesteels"], women: ["earrings", "necklaces", "bracelets", "hair-ornaments"],
    silverware: ["bowls", "cups", "vessels", "decorative"], horse: ["saddles", "bridles", "stirrups", "saddle-accessories"],
    "snuff-bottles": ["bottles", "stoppers", "spoons", "pouches"],
  };
  for (const category of categoryIds) {
    assert.deepEqual(Object.keys(subcategories[category]), children[category]);
    for (const locale of ["mn", "en"] as const) {
      assert.ok(categories[category][locale]);
      for (const name of Object.values(subcategories[category])) assert.ok(name[locale]);
    }
  }
});
test("subcategory lookup rejects cross-parent values, null and inherited object properties", () => {
  assert.equal(isSubcategory("horse", "saddles"), true);
  assert.equal(isSubcategory("silverware", "saddles"), false);
  assert.equal(isSubcategory("men", "earrings"), false);
  assert.equal(isSubcategory("women", null), false);
  assert.equal(isSubcategory("men", "constructor"), false);
  assert.equal(isSubcategory("unknown" as Category, "rings"), false);
});
test("the original ten records retain migrated taxonomy and unverified facts as catalog grows", () => {
  assert.ok(raw.length >= 1 && raw.length <= 100);
  for (let index = 0; index < 10; index++) {
    const id = `TT-${String(index + 1).padStart(3, "0")}`;
    const entry = raw.find((record: { id: string }) => record.id === id);
    assert.ok(entry, `${id} is retained`);
    assert.equal(entry.category, index < 5 ? "horse" : "silverware");
    assert.equal(entry.subcategory, index < 5 ? "saddles" : "bowls");
    assert.equal(entry.material, null); assert.equal(entry.price, null);
    assert.equal(entry.availability, "unverified"); assert.equal(entry.verificationStatus, "needs_review");
    assert.equal(entry.publicationStatus, "sample");
  }
});
test("public projection safely normalizes only populated legacy categories and strips private evidence", () => {
  const { subcategory: _subcategory, ...withoutChild } = raw[0];
  const horse = publicCatalogProduct({ ...withoutChild, category: "saddles", evidenceNotes: "private" });
  assert.equal(horse.category, "horse"); assert.equal(horse.subcategory, "saddles");
  assert.equal("evidenceNotes" in horse, false); assert.equal("sourceUrl" in horse, false);
  const bowl = publicCatalogProduct({ ...withoutChild, category: "vessels" });
  assert.equal(bowl.category, "silverware"); assert.equal(bowl.subcategory, "bowls");
  for (const category of ["accessories", "jewelry", "objects", "unknown"])
    assert.throws(() => publicCatalogProduct({ ...withoutChild, category }));
  assert.throws(() => publicCatalogProduct({ ...raw[0], category: "saddles", subcategory: "rings" }));
});
test("missing child remains unselected but a mismatched public parent/child is invalid", () => {
  const { subcategory: _subcategory, ...withoutChild } = raw[0];
  assert.equal(publicCatalogProduct(withoutChild).subcategory, null);
  assert.throws(() => publicCatalogProduct({ ...raw[0], subcategory: "bowls" }));
});
test("saved legacy drafts migrate safely while incoming edits must use the new taxonomy", () => {
  const initial = initialCatalogReview(product);
  const { subcategory: _subcategory, ...withoutChild } = initial.fields;
  const legacy = { ...initial, fields: { ...withoutChild, category: "saddles" } };
  const parsed = catalogReviewRecordSchema.parse(legacy);
  assert.equal(parsed.fields.category, "horse"); assert.equal(parsed.fields.subcategory, "saddles");
  assert.equal(catalogReviewMutationSchema.safeParse({ revision: 0, action: "save", fields: legacy.fields }).success, false);
  const missingChild = catalogReviewMutationSchema.parse({ revision: 0, action: "save", fields: { ...withoutChild, category: "horse" } });
  assert.equal(missingChild.fields.subcategory, null);
  assert.ok(missingCatalogRequirements(missingChild.fields).includes("subcategory"));
  assert.throws(() => reviewedPublicProduct(product, missingChild.fields));
  assert.equal(catalogReviewMutationSchema.safeParse({ revision: 0, action: "save", fields: { ...initial.fields, category: "women", subcategory: "saddles" } }).success, false);
});
