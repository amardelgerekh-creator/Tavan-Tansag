import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { isSubcategory } from "../src/lib/catalog";
import { publicCatalogProduct } from "../src/lib/server/catalog-reader";

const projectId = "tavan-tansag-30560";
const databaseId = "tavan-tansag-preview";
const raw: unknown = JSON.parse(readFileSync("data/catalog.json", "utf8"));
if (!Array.isArray(raw) || raw.length < 1 || raw.length > 100)
  throw new Error("Expected 1–100 source-backed sample products.");
const products = raw.map((value) => ({ ...publicCatalogProduct(value), visibility: "public" }));
for (const key of ["id", "slug", "image"] as const)
  if (new Set(products.map((product) => product[key])).size !== products.length)
    throw new Error(`Each sample product must have a distinct ${key}.`);
for (const key of ["sourceFileName", "sourceUrl"] as const)
  if (raw.some((record) => typeof record?.[key] !== "string" || !record[key].trim()))
    throw new Error(`Each sample product must have a recorded ${key}.`);
if (new Set(raw.map((record) => record.sourceUrl)).size !== raw.length)
  throw new Error("Each sample product must have a distinct sourceUrl; source filenames may repeat.");
if (raw.some((record) => !/^https:\/\/drive\.google\.com\//.test(record.sourceUrl)))
  throw new Error("Each sample must retain its Google Drive source.");
if (products.some((product) => !isSubcategory(product.category, product.subcategory) || !existsSync(resolve("public", "." + product.image))))
  throw new Error("Each sample needs a valid parent/child category and a real local image.");
if (products.some((p) => p.publicationStatus !== "sample" || p.verificationStatus !== "needs_review"))
  throw new Error("This seed only creates unverified sample products.");
if (products.some((product) => product.availability !== "unverified" || [product.price, product.material, product.dimensions, product.weight, product.maker, product.period, product.condition ?? null].some((value) => value !== null)))
  throw new Error("Unverified image samples must not assert price, material, dimensions, provenance, condition or stock.");

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
