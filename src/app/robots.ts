import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/catalog";
export default function robots(): MetadataRoute.Robots {
  const live = process.env.SITE_INDEXABLE === "true";
  return {
    rules: {
      userAgent: "*",
      ...(live
        ? {
            allow: "/",
            disallow: ["/api/", "/admin", "/mn/inquiry", "/en/inquiry"],
          }
        : { disallow: "/" }),
    },
    ...(live ? { sitemap: siteUrl + "/sitemap.xml" } : {}),
  };
}
