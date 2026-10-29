import { readFileSync, writeFileSync } from "node:fs";
import { publicCatalogProduct } from "../src/lib/server/catalog-reader";

const projectId = "tavan-tansag-30560";
const databaseId = "tavan-tansag-preview";
const raw: unknown[] = JSON.parse(readFileSync("data/catalog.json", "utf8"));
const products = raw.map((value) => ({ ...publicCatalogProduct(value), visibility: "public" }));
if (products.length !== 10 || new Set(products.map((p) => p.id)).size !== 10 || new Set(products.map((p) => p.slug)).size !== 10)
  throw new Error("Expected exactly ten distinct sample products.");
if (products.some((p) => p.publicationStatus !== "sample" || p.verificationStatus !== "needs_review"))
  throw new Error("This seed only creates unverified sample products.");

function encode(value: unknown): unknown {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number" && Number.isFinite(value))
    return Number.isSafeInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (value && typeof value === "object" && !Array.isArray(value))
    return { mapValue: { fields: fields(value) } };
  throw new Error("Unsupported seed value.");
}
function fields(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, encode(v)]));
}

writeFileSync("firebase/seed.json", JSON.stringify(products, null, 2) + "\n");
writeFileSync("firebase/seed-write.json", JSON.stringify({
  writes: products.map((product) => ({
    update: {
      name: `projects/${projectId}/databases/${databaseId}/documents/catalog_public/${product.id}`,
      fields: fields(product),
    },
    // Atomic commit refuses to overwrite any existing product document.
    currentDocument: { exists: false },
  })),
}, null, 2) + "\n");
console.log(`Prepared ${products.length} sanitized sample documents; no network request performed.`);
