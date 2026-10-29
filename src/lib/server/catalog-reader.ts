import { z } from "zod";
import type { Product } from "../catalog";

// Explicit projection: never select private.product_details, cost, provenance,
// staff notes, or arbitrary new columns when the database schema grows.
export const catalogSelect =
  "code,slug,category,publication_status,verification_status,availability,price,currency,material,dimensions,weight,maker,period,image_path,product_translations(locale,name,description,observations,publication_status)";
export function catalogFilter(includeSamples: boolean): string {
  const published =
    "and(publication_status.eq.published,verification_status.eq.verified)";
  return includeSamples
    ? published +
        ",and(publication_status.eq.sample,verification_status.eq.needs_review)"
    : published;
}

const localized = z.object({ mn: z.string(), en: z.string() });
const publicProduct = z.object({
  id: z.string().regex(/^TT-\d{3,6}$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum(["saddles", "vessels", "accessories", "jewelry", "objects"]),
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
});

export class CatalogUnavailableError extends Error {
  constructor() {
    super("The catalog is temporarily unavailable.");
    this.name = "CatalogUnavailableError";
  }
}

/** Zod strips every property outside the public contract, even in file mode. */
export function publicCatalogProduct(value: unknown): Product {
  return publicProduct.parse(value);
}

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
      row.publication_status === "published" &&
      row.verification_status === "verified";
    const sample =
      includeSamples &&
      row.publication_status === "sample" &&
      row.verification_status === "needs_review";
    // The server secret bypasses RLS. Re-check the allowlist after the query.
    if (!published && !sample) continue;
    if (!Array.isArray(row.product_translations))
      throw new CatalogUnavailableError();
    const translations = row.product_translations.map(object);
    const mn = translations.find(
      (t) =>
        t.locale === "mn" &&
        (t.publication_status === "published" ||
          (sample && t.publication_status === "draft")),
    );
    const en = translations.find(
      (t) =>
        t.locale === "en" &&
        (t.publication_status === "published" ||
          (sample && t.publication_status === "draft")),
    );
    // Do not leak draft translations of otherwise published products.
    if (!mn || !en) continue;
    const product = publicCatalogProduct({
      id: row.code,
      slug: row.slug,
      category: row.category,
      name: { mn: mn.name, en: en.name },
      description: { mn: mn.description, en: en.description },
      observations: { mn: mn.observations ?? "", en: en.observations ?? "" },
      image: row.image_path,
      verificationStatus: row.verification_status,
      publicationStatus: row.publication_status,
      availability: row.availability,
      price: row.price,
      currency: row.currency,
      material: row.material,
      dimensions: row.dimensions,
      weight: row.weight,
      maker: row.maker,
      period: row.period,
    });
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
  url?: string;
  secretKey?: string;
}
export async function readCatalog(
  config: CatalogConfig,
  dependencies: {
    file: () => Product[];
    query: (input: {
      url: string;
      secretKey: string;
      select: string;
      filter: string;
    }) => Promise<unknown>;
  },
): Promise<Product[]> {
  if (!config.source || config.source === "file")
    return dependencies.file().map(publicCatalogProduct);
  if (config.source !== "supabase" || !config.url || !config.secretKey)
    throw new CatalogUnavailableError();
  try {
    const url = new URL(config.url);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new CatalogUnavailableError();
    const includeSamples = config.includeSamples === "true";
    const rows = await dependencies.query({
      url: config.url,
      secretKey: config.secretKey,
      select: catalogSelect,
      filter: catalogFilter(includeSamples),
    });
    return projectDatabaseCatalog(rows, includeSamples);
  } catch {
    // Provider errors can contain project details. Never surface them or hide a
    // failed cloud read behind a successful-looking local catalog.
    throw new CatalogUnavailableError();
  }
}
