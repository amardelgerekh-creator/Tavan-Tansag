import { z } from "zod";
import { categoryIds, isSubcategory, normalizeLegacyTaxonomy, type Product } from "../catalog";

const localized = z.object({ mn: z.string(), en: z.string() });
const publicProductFields = z.object({
  id: z.string().regex(/^TT-\d{3,6}$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum(categoryIds),
  subcategory: z.string().max(80).nullable().default(null),
  name: localized.extend({ mn: z.string().min(1), en: z.string().min(1) }),
  description: localized.extend({
    mn: z.string().min(1),
    en: z.string().min(1),
  }),
  observations: localized,
  image: z
    .string()
    .regex(/^\/images\/[a-zA-Z0-9_/-]+\.(?:jpg|jpeg|png|webp|avif)$/),
  verificationStatus: z.enum(["needs_review", "verified"]),
  publicationStatus: z.enum(["sample", "published"]),
  availability: z.enum(["unverified", "available", "sold"]),
  price: z.number().finite().nonnegative().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  material: z.string().nullable(),
  dimensions: z.string().nullable(),
  weight: z.string().nullable(),
  maker: z.string().nullable(),
  period: z.string().nullable(),
  condition: z.string().nullish(),
  priceMode: z.enum(["fixed", "inquiry"]).nullish(),
});
const publicProduct = publicProductFields.superRefine((product, context) => {
  if (product.subcategory !== null && !isSubcategory(product.category, product.subcategory))
    context.addIssue({ code: "custom", path: ["subcategory"], message: "Subcategory does not belong to this category" });
});

export class CatalogUnavailableError extends Error {
  constructor() {
    super("The catalog is temporarily unavailable.");
    this.name = "CatalogUnavailableError";
  }
}

/** Zod strips every property outside the public contract, even in file mode. */
export function publicCatalogProduct(value: unknown): Product {
  return publicProduct.parse(normalizeLegacyTaxonomy(value));
}

// Keep private provenance in the internal seed source, never in this collection.
// Projection is defense in depth; Firestore Rules authorize whole documents.
export const catalogFields = [...Object.keys(publicProductFields.shape), "visibility"];
export const catalogCollection = "catalog_public";

type DatabaseRow = Record<string, unknown>;
function object(value: unknown): DatabaseRow {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new CatalogUnavailableError();
  return value as DatabaseRow;
}

export function projectDatabaseCatalog(
  data: unknown,
  includeSamples: boolean,
): Product[] {
  if (!Array.isArray(data)) throw new CatalogUnavailableError();
  const result: Product[] = [];
  const codes = new Set<string>();
  const slugs = new Set<string>();
  for (const input of data) {
    const row = object(input);
    const published =
      row.publicationStatus === "published" &&
      row.verificationStatus === "verified";
    const sample =
      includeSamples &&
      row.publicationStatus === "sample" &&
      row.verificationStatus === "needs_review";
    if (row.visibility !== "public" || (!published && !sample)) continue;
    const product = publicCatalogProduct(row);
    if (codes.has(product.id) || slugs.has(product.slug))
      throw new CatalogUnavailableError();
    codes.add(product.id);
    slugs.add(product.slug);
    result.push(product);
  }
  return result;
}

export interface CatalogConfig {
  source?: string;
  includeSamples?: string;
  projectId?: string;
  databaseId?: string;
}
export async function readCatalog(
  config: CatalogConfig,
  dependencies: {
    file: () => Product[];
    query: (input: {
      projectId: string;
      databaseId: string;
      includeSamples: boolean;
    }) => Promise<unknown>;
  },
): Promise<Product[]> {
  if (!config.source || config.source === "file")
    return dependencies.file().map(publicCatalogProduct);
  if (
    config.source !== "firebase" ||
    !config.projectId || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.projectId) ||
    !config.databaseId || !/^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(config.databaseId)
  )
    throw new CatalogUnavailableError();
  try {
    const includeSamples = config.includeSamples === "true";
    const rows = await dependencies.query({
      projectId: config.projectId,
      databaseId: config.databaseId,
      includeSamples,
    });
    return projectDatabaseCatalog(rows, includeSamples);
  } catch {
    // Provider errors can contain project details. Never surface them or hide a
    // failed cloud read behind a successful-looking local catalog.
    throw new CatalogUnavailableError();
  }
}
