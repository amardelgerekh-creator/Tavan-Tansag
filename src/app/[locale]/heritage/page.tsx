import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/lib/articles";
import { isLocale } from "@/lib/catalog";
import { getLocalCatalog } from "@/lib/server/local-catalog";
import { Arrow } from "@/components/icons";
import { Consultation } from "@/components/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Heritage & craft" : "Өв соёл, ур хийц",
    alternates: {
      canonical: `/${locale}/heritage`,
      languages: { mn: "/mn/heritage", en: "/en/heritage" },
    },
  };
}

export default async function Heritage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const products = getLocalCatalog();
  return (
    <>
      <section className="container section">
        <div className="page-heading">
          <span className="eyebrow">
            {locale === "mn" ? "ӨВ СОЁЛЫН ТЭМДЭГЛЭЛ" : "NOTES ON HERITAGE"}
          </span>
          <h1>
            {locale === "mn"
              ? "Ур хийцийг ойлгох нь."
              : "A closer look at craft."}
          </h1>
          <p>
            {locale === "mn"
              ? "Хэлбэрийг ажиглаж, түүхийг асууж, мэдээллийг нягтлахад тань зориулсан тэмдэглэлүүд."
              : "Notes to help you observe the form, ask about the story, and understand the information behind a piece."}
          </p>
        </div>
        <div className="article-grid">
          {articles.map((article, index) => {
            const piece = products[article.imageIndex] || products[0];
            return (
              <article className="journal-card" key={article.slug}>
                <Link
                  href={`/${locale}/heritage/${article.slug}`}
                  className="journal-card-image"
                  aria-label={article.title[locale]}
                >
                  {piece && (
                    <Image
                      src={piece.image}
                      alt={piece.name[locale]}
                      fill
                      sizes="(max-width: 760px) 90vw, 30vw"
                    />
                  )}
                </Link>
                <div className="journal-card-copy">
                  <span className="eyebrow">
                    0{index + 1} / {article.category[locale]}
                  </span>
                  <h2>
                    <Link href={`/${locale}/heritage/${article.slug}`}>
                      {article.title[locale]}
                    </Link>
                  </h2>
                  <p>{article.summary[locale]}</p>
                  <Link
                    className="text-link"
                    href={`/${locale}/heritage/${article.slug}`}
                  >
                    {locale === "mn" ? "Унших" : "Read the note"}
                    <Arrow />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <Consultation locale={locale} />
    </>
  );
}
