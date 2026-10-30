import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isSubcategory } from "../src/lib/catalog";
import { publicCatalogProduct } from "../src/lib/server/catalog-reader";

const products = JSON.parse(readFileSync(resolve("data/catalog.json"), "utf8"));
test("bounded sample records have bilingual copy, unique traceable sources, valid taxonomy and real images", () => {
  assert.ok(products.length >= 1 && products.length <= 100);
  for (const field of ["id", "slug", "image", "sourceUrl"])
    assert.equal(
      new Set(products.map((p: Record<string, unknown>) => p[field])).size,
      products.length,
      field + " must be unique",
    );
  for (const p of products) {
    assert.match(p.id, /^TT-\d{3,6}$/);
    const publicRecord = publicCatalogProduct(p);
    assert.ok(isSubcategory(publicRecord.category, publicRecord.subcategory));
    for (const field of ["name", "description", "observations"])
      for (const locale of ["mn", "en"])
        assert.ok(p[field][locale].trim().length > 5);
    assert.ok(p.image.startsWith("/images/catalog/"));
    assert.ok(existsSync(resolve("public", "." + p.image)), p.image);
    assert.equal(typeof p.sourceFileName, "string");
    assert.ok(p.sourceFileName.trim().length > 0);
    assert.match(p.sourceUrl, /^https:\/\/drive\.google\.com\//);
    assert.ok(p.needsConfirmation.length > 0);
  }
});
test("original ten piece identities and photos remain intact as the catalog expands", () => {
  const original = [
    ["saddle-blue-border", "EXA_7800.jpg"], ["saddle-multicolour-border", "EXA_7843.jpg"],
    ["saddle-dark-border", "EXA_7861.jpg"], ["saddle-green-flaps", "EXA_7893.jpg"],
    ["saddle-burgundy-flaps", "EXA_7902.jpg"], ["bowl-orange-band", "EXA_8478.jpg"],
    ["bowl-geometric-base", "EXA_8514.jpg"], ["bowl-wide-tan-band", "EXA_8553.jpg"],
    ["bowl-low-orange-band", "EXA_8597.jpg"], ["bowl-dark-surface", "EXA_8634.jpg"],
  ];
  for (const [index, [slug, sourceFileName]] of original.entries()) {
    const id = `TT-${String(index + 1).padStart(3, "0")}`;
    const item = products.find((product: { id: string }) => product.id === id);
    assert.ok(item, `${id} is retained`);
    assert.equal(item.slug, slug); assert.equal(item.sourceFileName, sourceFileName);
    assert.equal(item.image, `/images/catalog/${id.toLowerCase()}.jpg`);
  }
});
test("sample catalog does not invent commercial or provenance facts", () => {
  for (const p of products) {
    for (const field of [
      "price",
      "material",
      "dimensions",
      "weight",
      "maker",
      "period",
    ])
      assert.equal(p[field], null, p.id + " " + field);
    assert.equal(p.condition ?? null, null, p.id + " condition");
    assert.equal(p.availability, "unverified");
    assert.equal(p.verificationStatus, "needs_review");
    assert.equal(p.publicationStatus, "sample");
  }
});
