import { categories, type Category, type Locale, type Product } from "./catalog";

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

export function filterProducts(products: Product[], category: Category | "all", query: string) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return products.filter((piece) => {
    if (category !== "all" && piece.category !== category) return false;
    const text = normalizeSearch([
      piece.id, piece.id.replaceAll("-", ""),
      piece.name.mn, piece.name.en,
      categories[piece.category].mn, categories[piece.category].en,
      piece.description.mn, piece.description.en,
    ].join(" "));
    return terms.every((term) => text.includes(term));
  });
}
