import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, siteUrl } from "@/lib/catalog";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/site";
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
      default:
        locale === "en"
          ? "Tavan Tansag · Enduring Mongolian Heritage"
          : "Таван Тансаг · Мөнх Үргэлжлэх Монгол Өв",
      template: "%s · Tavan Tansag",
    },
    description:
      locale === "en"
        ? "Tavan Tansag — Mongolian Heritage Jewelry House. Explore traditional craft and precious objects that carry heritage from one generation to the next."
        : "Таван Тансаг — Монгол өвийн үнэт эдлэлийн дэлгүүр. Мөнх Үргэлжлэх Монгол Өв. Үеэс үед өвлөх урлал, үнэт эдлэлүүдтэй танилцаарай.",
    icons: {
      icon: { url: "/images/brand/mark.svg", type: "image/svg+xml" },
    },
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
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
