export type Locale = "mn" | "en";
export type Category =
  | "saddles"
  | "vessels"
  | "accessories"
  | "jewelry"
  | "objects";
export type Localized = Record<Locale, string>;
export interface Product {
  id: string;
  slug: string;
  category: Category;
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
  observations: Localized;
}
export const categories: Record<Category, Localized> = {
  saddles: { mn: "Эмээл, тоног", en: "Saddles & tack" },
  vessels: { mn: "Аяга, сав суулга", en: "Vessels & bowls" },
  accessories: { mn: "Уламжлалт хэрэглэл", en: "Traditional accessories" },
  jewelry: { mn: "Гоёл чимэглэл", en: "Jewelry" },
  objects: { mn: "Уран хийцэт эдлэл", en: "Decorative objects" },
};
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
