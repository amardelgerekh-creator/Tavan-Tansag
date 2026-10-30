import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Product } from "../src/lib/catalog";
import { filterProducts, productAvailability, productPrice, relatedProducts, readCatalogFilters, updateCatalogSearch } from "../src/lib/product-presentation";

const products = JSON.parse(readFileSync("data/catalog.json", "utf8")) as Product[];

test("sample records never present a price or stock claim as confirmed", () => {
  const sample = { ...products[0], price: 2_500_000, availability: "available" };
  assert.equal(productPrice(sample, "en"), "Price on enquiry");
  assert.equal(productAvailability(sample, "en"), "Confirm with our team");
  const reviewed = { ...sample, verificationStatus: "verified", publicationStatus: "published", priceMode: "fixed" as const };
  assert.match(productPrice(reviewed, "en"), /2,500,000/);
  assert.equal(productAvailability(reviewed, "en"), "Available");
  assert.equal(productAvailability({ ...reviewed, availability: "sold" }, "mn"), "Борлогдсон");
  assert.equal(productPrice({ ...reviewed, price: null }, "en"), "Price on enquiry");
  assert.equal(productPrice({ ...reviewed, priceMode: "inquiry" }, "en"), "Price on enquiry");
});

test("recommendations stay within the current category and exclude the current piece", () => {
  const bowl = products.find((piece) => piece.category === "silverware")!;
  const related = relatedProducts(products, bowl);
  assert.equal(related.length, 3);
  assert.ok(related.every((piece) => piece.category === "silverware" && piece.id !== bowl.id));
  assert.deepEqual(relatedProducts([bowl], bowl), []);
});

test("catalog search supports both languages, multiple terms and compact references while retaining category filtering", () => {
  assert.equal(filterProducts(products, "all", "TT001")[0]?.id, "TT-001");
  assert.equal(filterProducts(products, "all", "  blue  saddle ")[0]?.id, "TT-001");
  const bowls = filterProducts(products, "all", "аяга");
  assert.equal(bowls.length, 5);
  assert.ok(bowls.every((piece) => piece.category === "silverware"));
  assert.deepEqual(filterProducts(products, "silverware", "TT-001"), []);
});

test("child filters require their matching main category and search includes localized child labels", () => {
  assert.equal(filterProducts(products, "horse", "", "saddles").length, 5);
  assert.equal(filterProducts(products, "silverware", "", "bowls").length, 5);
  assert.deepEqual(filterProducts(products, "horse", "", "bowls"), []);
  assert.deepEqual(filterProducts(products, "all", "", "bowls"), []);
  assert.deepEqual(filterProducts(products, "men", "", "belts"), []);
  const fixture = { ...products[0], category: "horse" as const, subcategory: "bridles", name: { mn: "Туршилтын эдлэл", en: "Test object" }, description: { mn: "Тайлбар", en: "Description" } };
  assert.equal(filterProducts([fixture], "all", "bridles").length, 1);
  assert.equal(filterProducts([fixture], "all", "хазаар").length, 1);
});

test("category URL state validates child-parent combinations and resets children when changing main filters", () => {
  assert.deepEqual(readCatalogFilters(new URLSearchParams("category=horse&subcategory=saddles&q=blue")), { category: "horse", subcategory: "saddles", query: "blue" });
  assert.deepEqual(readCatalogFilters(new URLSearchParams("category=women&subcategory=saddles")), { category: "women", subcategory: "all", query: "" });
  assert.deepEqual(readCatalogFilters(new URLSearchParams("category=unknown&subcategory=bowls")), { category: "all", subcategory: "all", query: "" });
  const changed = new URLSearchParams(updateCatalogSearch("category=horse&subcategory=saddles&q=blue&utm_source=reference", { category: "women" }));
  assert.equal(changed.get("category"), "women");
  assert.equal(changed.has("subcategory"), false);
  assert.equal(changed.get("q"), "blue");
  assert.equal(changed.get("utm_source"), "reference");
  assert.equal(updateCatalogSearch("category=horse&subcategory=saddles&q=blue", { category: "all", subcategory: "all", query: "" }), "");
  assert.equal(readCatalogFilters(new URLSearchParams({ q: "x".repeat(1000) })).query.length, 240);
});
