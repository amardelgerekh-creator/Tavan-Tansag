export type Locale = "mn" | "en";
export const categoryIds = ["men", "women", "silverware", "horse", "snuff-bottles"] as const;
export type Category = (typeof categoryIds)[number];
export type Localized = Record<Locale, string>;
export interface Product {
  id: string;
  slug: string;
  category: Category;
  subcategory: string | null;
  name: Localized;
  description: Localized;
  image: string;
  verificationStatus: string;
  publicationStatus: string;
  availability: string;
  price: number | null;
  currency: string;
  material: string | null;
  dimensions: string | null;
  weight: string | null;
  maker: string | null;
  period: string | null;
  condition?: string | null;
  priceMode?: "fixed" | "inquiry" | null;
  observations: Localized;
}
export const categories: Record<Category, Localized> = {
  men: { mn: "Эрэгтэй гоёл", en: "Men's accessories" },
  women: { mn: "Эмэгтэй гоёл", en: "Women's accessories" },
  silverware: { mn: "Мөнгөн эдлэл", en: "Silverware" },
  horse: { mn: "Морины хэрэглэл", en: "Horse accessories" },
  "snuff-bottles": { mn: "Хөөрөг", en: "Snuff bottles" },
};
export const subcategories: Record<Category, Record<string, Localized>> = {
  men: {
    belts: { mn: "Бүс", en: "Belts" }, rings: { mn: "Бөгж", en: "Rings" },
    knives: { mn: "Хутга", en: "Knives" }, firesteels: { mn: "Хэт", en: "Firesteels" },
  },
  women: {
    earrings: { mn: "Ээмэг", en: "Earrings" }, necklaces: { mn: "Зүүлт", en: "Necklaces" },
    bracelets: { mn: "Бугуйвч", en: "Bracelets" }, "hair-ornaments": { mn: "Үсний чимэг", en: "Hair ornaments" },
  },
  silverware: {
    bowls: { mn: "Аяга", en: "Bowls" }, cups: { mn: "Хундага", en: "Cups" },
    vessels: { mn: "Сав суулга", en: "Vessels" }, decorative: { mn: "Чимэглэлийн эдлэл", en: "Decorative pieces" },
  },
  horse: {
    saddles: { mn: "Эмээл", en: "Saddles" }, bridles: { mn: "Хазаар", en: "Bridles" },
    stirrups: { mn: "Дөрөө", en: "Stirrups" }, "saddle-accessories": { mn: "Эмээлийн тоног", en: "Saddle accessories" },
  },
  "snuff-bottles": {
    bottles: { mn: "Хөөрөг", en: "Bottles" }, stoppers: { mn: "Хөөрөгний толгой", en: "Stoppers" },
    spoons: { mn: "Хөөрөгний халбага", en: "Spoons" }, pouches: { mn: "Даалин", en: "Pouches" },
  },
};
export function isSubcategory(category: Category, value: unknown): value is string {
  return typeof value === "string" && Object.hasOwn(subcategories, category) && Object.hasOwn(subcategories[category], value);
}

/** Read compatibility only for the two populated legacy groups; never guess an ambiguous category. */
export function normalizeLegacyTaxonomy(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  const mapped = record.category === "saddles" ? { category: "horse", subcategory: "saddles" }
    : record.category === "vessels" ? { category: "silverware", subcategory: "bowls" } : null;
  if (!mapped || (record.subcategory != null && record.subcategory !== mapped.subcategory)) return value;
  return { ...record, ...mapped };
}
export function isLocale(value: string): value is Locale {
  return value === "mn" || value === "en";
}
export const facebookUrl =
  "https://www.facebook.com/profile.php?id=61572155406045";
export const driveUrl =
  "https://drive.google.com/drive/folders/1xJEoi13p6yXufxGmnIqUVdkxe0-fAgCB";
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
