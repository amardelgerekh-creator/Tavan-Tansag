import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Product } from "../src/lib/catalog";
import { filterProducts, productAvailability, productPrice, relatedProducts } from "../src/lib/product-presentation";

const products = JSON.parse(readFileSync("data/catalog.json", "utf8")) as Product[];

test("sample records never present a price or stock claim as confirmed", () => {
  const sample = { ...products[0], price: 2_500_000, availability: "available" };
  assert.equal(productPrice(sample, "en"), "Price on enquiry");
  assert.equal(productAvailability(sample, "en"), "Confirm with our team");
  const reviewed = { ...sample, verificationStatus: "verified", publicationStatus: "published" };
  assert.match(productPrice(reviewed, "en"), /2,500,000/);
  assert.equal(productAvailability(reviewed, "en"), "Available");
  assert.equal(productAvailability({ ...reviewed, availability: "sold" }, "mn"), "Борлогдсон");
  assert.equal(productPrice({ ...reviewed, price: null }, "en"), "Price on enquiry");
});

test("recommendations stay within the current category and exclude the current piece", () => {
  const bowl = products.find((piece) => piece.category === "vessels")!;
  const related = relatedProducts(products, bowl);
  assert.equal(related.length, 3);
  assert.ok(related.every((piece) => piece.category === "vessels" && piece.id !== bowl.id));
  assert.deepEqual(relatedProducts([bowl], bowl), []);
});

test("catalog search supports both languages, multiple terms and compact references while retaining category filtering", () => {
  assert.equal(filterProducts(products, "all", "TT001")[0]?.id, "TT-001");
  assert.equal(filterProducts(products, "all", "  blue  saddle ")[0]?.id, "TT-001");
  const bowls = filterProducts(products, "all", "аяга");
  assert.equal(bowls.length, 5);
  assert.ok(bowls.every((piece) => piece.category === "vessels"));
  assert.deepEqual(filterProducts(products, "vessels", "TT-001"), []);
});
