import type { Locale } from "@/lib/catalog";

/** Original outlined lockups from the supplied brandbook, pages 4 and 6. */
export function BrandLogo({ locale }: { locale: Locale }) {
  return (
    <img
      className="brand-logo"
      src={`/images/brand/logo-${locale}.svg`}
      width="608"
      height="383"
      alt={
        locale === "mn"
          ? "Таван Тансаг — Монгол өвийн үнэт эдлэлийн дэлгүүр"
          : "Tavan Tansag — Mongolian Heritage Jewelry House"
      }
    />
  );
}
