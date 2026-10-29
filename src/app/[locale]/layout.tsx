import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, siteUrl } from "@/lib/catalog";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/site";
import { t } from "@/lib/copy";
import "../globals.css";

export function generateStaticParams() {
  return [{ locale: "mn" }, { locale: "en" }];
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Таван Тансаг · Tavan Tansag",
      template: "%s · Tavan Tansag",
    },
    description:
      locale === "en"
        ? "Mongolian craft, heritage and precious objects. Discover the Tavan Tansag collection."
        : "Монгол урлал, өв уламжлал, үнэт эдлэл. Таван Тансагийн эдлэлүүдтэй танилцаарай.",
    robots: {
      index: process.env.SITE_INDEXABLE === "true",
      follow: process.env.SITE_INDEXABLE === "true",
    },
  };
}
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          {locale === "mn" ? "Үндсэн агуулга руу" : "Skip to content"}
        </a>
        <Navigation locale={locale} />
        <main id="main">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
