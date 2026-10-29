import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const products = JSON.parse(readFileSync(resolve("data/catalog.json"), "utf8"));
test("ten distinct sample records have bilingual copy, traceable sources, and real local images", () => {
  assert.equal(products.length, 10);
  for (const field of ["id", "slug", "image", "sourceFileName"])
    assert.equal(
      new Set(products.map((p: Record<string, unknown>) => p[field])).size,
      10,
      field + " must be unique",
    );
  for (const p of products) {
    assert.match(p.id, /^TT-\d{3}$/);
    for (const field of ["name", "description", "observations"])
      for (const locale of ["mn", "en"])
        assert.ok(p[field][locale].trim().length > 5);
    assert.ok(p.image.startsWith("/images/catalog/"));
    assert.ok(existsSync(resolve("public", "." + p.image)), p.image);
    assert.match(p.sourceUrl, /^https:\/\/drive\.google\.com\//);
    assert.ok(p.needsConfirmation.length > 0);
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
    assert.equal(p.availability, "unverified");
    assert.equal(p.verificationStatus, "needs_review");
    assert.equal(p.publicationStatus, "sample");
  }
});
