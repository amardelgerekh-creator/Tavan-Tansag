import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog-store";
import { articles } from "@/lib/articles";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.SITE_INDEXABLE !== "true") return [];
  const products = await getCatalog();
  const paths = [
    "",
    "/collection",
    "/heritage",
    "/about",
    "/services",
    ...articles.map(article => "/heritage/" + article.slug),
    ...products
      .filter(
        (p) =>
          p.publicationStatus === "published" &&
          p.verificationStatus === "verified",
      )
      .map((p) => "/products/" + p.slug),
  ];
  return paths.flatMap((path) =>
    ["mn", "en"].map((locale) => ({
      url: siteUrl + "/" + locale + path,
      alternates: {
        languages: { mn: siteUrl + "/mn" + path, en: siteUrl + "/en" + path },
      },
    })),
  );
}
