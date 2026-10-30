import { categories, categoryIds, subcategories, isSubcategory, type Category, type Locale, type Product } from "./catalog";

export function relatedProducts(products: Product[], current: Product, limit = 3) {
  return products
    .filter((piece) => piece.id !== current.id && piece.category === current.category)
    .slice(0, Math.max(0, limit));
}

export function productPrice(product: Product, locale: Locale): string {
  const pending = locale === "mn" ? "Үнэ лавлах" : "Price on enquiry";
  if (
    product.verificationStatus !== "verified" ||
    product.publicationStatus !== "published" ||
    product.priceMode === "inquiry" ||
    product.price === null ||
    !Number.isFinite(product.price) ||
    product.price < 0 ||
    !/^[A-Z]{3}$/.test(product.currency)
  ) return pending;
  return new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-US", {
    style: "currency",
    currency: product.currency,
    maximumFractionDigits: 2,
  }).format(product.price);
}

export function productAvailability(product: Product, locale: Locale): string {
  if (product.verificationStatus === "verified" && product.publicationStatus === "published") {
    if (product.availability === "available") return locale === "mn" ? "Бэлэн" : "Available";
    if (product.availability === "sold") return locale === "mn" ? "Борлогдсон" : "Sold";
  }
  return locale === "mn" ? "Зөвлөхөөс тодруулах" : "Confirm with our team";
}

function normalizeSearch(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().trim();
}

export type CatalogFilters = { category: Category | "all"; subcategory: string; query: string };

/** Query parameters are shareable UI state, never trusted taxonomy values. */
export function readCatalogFilters(params: Pick<URLSearchParams, "get">): CatalogFilters {
  const rawCategory = params.get("category");
  const category: Category | "all" = categoryIds.includes(rawCategory as Category) ? rawCategory as Category : "all";
  const rawSubcategory = params.get("subcategory");
  return {
    category,
    subcategory: category !== "all" && rawSubcategory && isSubcategory(category, rawSubcategory) ? rawSubcategory : "all",
    query: (params.get("q") ?? "").slice(0, 240),
  };
}

/** Retain unrelated query parameters; changing a main category resets its child. */
export function updateCatalogSearch(current: string, change: Partial<CatalogFilters>): string {
  const params = new URLSearchParams(current);
  const previous = readCatalogFilters(params);
  const next = { ...previous, ...change };
  if (change.category !== undefined && change.subcategory === undefined) next.subcategory = "all";
  if (next.category === "all" || !categoryIds.includes(next.category)) {
    params.delete("category"); params.delete("subcategory");
  } else {
    params.set("category", next.category);
    if (next.subcategory !== "all" && isSubcategory(next.category, next.subcategory)) params.set("subcategory", next.subcategory);
    else params.delete("subcategory");
  }
  if (next.query) params.set("q", next.query.slice(0, 240));
  else params.delete("q");
  return params.toString();
}

export function filterProducts(products: Product[], category: Category | "all", query: string, subcategory = "all") {
  if (subcategory !== "all" && (category === "all" || !isSubcategory(category, subcategory))) return [];
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return products.filter((piece) => {
    if (category !== "all" && piece.category !== category) return false;
    if (subcategory !== "all" && piece.subcategory !== subcategory) return false;
    const child = piece.subcategory && isSubcategory(piece.category, piece.subcategory) ? subcategories[piece.category][piece.subcategory] : null;
    const text = normalizeSearch([
      piece.id, piece.id.replaceAll("-", ""),
      piece.name.mn, piece.name.en,
      categories[piece.category].mn, categories[piece.category].en,
      child?.mn ?? "", child?.en ?? "",
      piece.description.mn, piece.description.en,
    ].join(" "));
    return terms.every((term) => text.includes(term));
  });
}
