import { z } from "zod";
import { categoryIds, isSubcategory, normalizeLegacyTaxonomy, type Product } from "./catalog";

const text = (max: number) => z.string().trim().max(max);
const localized = (max: number) => z.object({ mn: text(max), en: text(max) }).strict();
export const catalogReviewFieldsSchema = z.object({
  name: localized(160), description: localized(1000),
  category: z.enum(categoryIds),
  subcategory: text(80).nullable().default(null),
  material: text(300), dimensions: text(200), condition: text(500),
  weight: text(150), maker: text(200), period: text(150),
  priceMode: z.enum(["unconfirmed", "fixed", "inquiry"]),
  price: z.number().finite().nonnegative().max(1e12).nullable(),
  currency: z.enum(["MNT", "USD", "EUR"]),
  availability: z.enum(["unverified", "available", "sold"]),
  informationOwner: text(160), photoOwner: text(160), evidenceNotes: text(1000),
  imageRightsConfirmed: z.boolean(), distinctItemConfirmed: z.boolean(), factsConfirmed: z.boolean(),
}).strict().superRefine((fields, context) => {
  if (fields.subcategory !== null && !isSubcategory(fields.category, fields.subcategory))
    context.addIssue({ code: "custom", path: ["subcategory"], message: "Subcategory does not belong to this category" });
});
export type CatalogReviewFields = z.infer<typeof catalogReviewFieldsSchema>;
export const catalogReviewMutationSchema = z.object({
  revision: z.number().int().min(0), action: z.enum(["save", "publish"]),
  fields: catalogReviewFieldsSchema,
}).strict();
export type CatalogReviewMutation = z.infer<typeof catalogReviewMutationSchema>;
export const catalogReviewRecordSchema = z.object({
  fields: z.preprocess(normalizeLegacyTaxonomy, catalogReviewFieldsSchema),
  revision: z.number().int().min(0),
  updatedAt: z.string().nullable(), updatedBy: z.string().nullable(),
  publishedAt: z.string().nullable(), publishedBy: z.string().nullable(),
  publishedRevision: z.number().int().min(1).nullable(),
}).strict();
export type CatalogReviewRecord = z.infer<typeof catalogReviewRecordSchema>;
export interface CatalogReviewItem {
  product: Product;
  review: CatalogReviewRecord;
  source: { url: string; fileName: string };
}

/** Publish is explicit; a draft may retain blanks while the store gathers facts. */
export function missingCatalogRequirements(fields: CatalogReviewFields): string[] {
  const missing: string[] = [];
  if (!isSubcategory(fields.category, fields.subcategory)) missing.push("subcategory");
  for (const key of ["material", "dimensions", "condition", "informationOwner", "photoOwner", "evidenceNotes"] as const)
    if (!fields[key]) missing.push(key);
  for (const key of ["name", "description"] as const)
    for (const locale of ["mn", "en"] as const) if (!fields[key][locale]) missing.push(`${key}.${locale}`);
  if (fields.priceMode === "unconfirmed" || (fields.priceMode === "fixed" && fields.price === null)) missing.push("priceMode");
  if (fields.availability === "unverified") missing.push("availability");
  for (const key of ["imageRightsConfirmed", "distinctItemConfirmed", "factsConfirmed"] as const)
    if (!fields[key]) missing.push(key);
  return missing;
}

export function initialCatalogReview(product: Product): CatalogReviewRecord {
  return {
    revision: 0, updatedAt: null, updatedBy: null, publishedAt: null, publishedBy: null, publishedRevision: null,
    fields: {
      name: product.name, description: product.description, category: product.category, subcategory: product.subcategory,
      material: product.material ?? "", dimensions: product.dimensions ?? "", condition: product.condition ?? "",
      weight: product.weight ?? "", maker: product.maker ?? "", period: product.period ?? "",
      priceMode: "unconfirmed", price: product.price, currency: ["MNT", "USD", "EUR"].includes(product.currency) ? product.currency as "MNT" | "USD" | "EUR" : "MNT",
      availability: ["available", "sold"].includes(product.availability) ? product.availability as "available" | "sold" : "unverified",
      informationOwner: "", photoOwner: "", evidenceNotes: "",
      imageRightsConfirmed: false, distinctItemConfirmed: false, factsConfirmed: false,
    },
  };
}

/** Deliberate allowlist. Never spread a review, source record or internal notes into a public document. */
export function reviewedPublicProduct(product: Product, fields: CatalogReviewFields): Product & { visibility: "public" } {
  if (missingCatalogRequirements(fields).length) throw new Error("INCOMPLETE_REVIEW");
  return {
    id: product.id, slug: product.slug, image: product.image, category: fields.category, subcategory: fields.subcategory,
    name: fields.name, description: fields.description, observations: product.observations,
    material: fields.material, dimensions: fields.dimensions, condition: fields.condition,
    weight: fields.weight || null, maker: fields.maker || null, period: fields.period || null,
    price: fields.priceMode === "fixed" ? fields.price : null,
    priceMode: fields.priceMode === "fixed" ? "fixed" : "inquiry", currency: fields.currency,
    availability: fields.availability, verificationStatus: "verified", publicationStatus: "published", visibility: "public",
  };
}
