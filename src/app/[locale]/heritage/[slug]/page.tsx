import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleBySlug, articles } from "@/lib/articles";
import { isLocale } from "@/lib/catalog";
import { getLocalCatalog } from "@/lib/server/local-catalog";
import { Arrow } from "@/components/icons";

export function generateStaticParams() {
  return ["mn", "en"].flatMap((locale) =>
    articles.map((article) => ({ locale, slug: article.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const article = articleBySlug(slug);
  if (!isLocale(locale) || !article) return {};
  return {
    title: article.title[locale],
    description: article.summary[locale],
    alternates: {
      canonical: `/${locale}/heritage/${slug}`,
      languages: { mn: `/mn/heritage/${slug}`, en: `/en/heritage/${slug}` },
    },
  };
}

export default async function HeritageArticle({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const article = articleBySlug(slug);
  if (!article) notFound();
  const products = getLocalCatalog();
  const piece = products[article.imageIndex] || products[0];
  return (
    <article className="container section">
      <div className="article-heading page-heading">
        <Link className="back-link" href={`/${locale}/heritage`}>
          ← {locale === "mn" ? "Өв соёлын тэмдэглэл" : "Notes on heritage"}
        </Link>
        <span className="eyebrow">{article.category[locale]}</span>
        <h1>{article.title[locale]}</h1>
        <p>{article.summary[locale]}</p>
        <div className="article-meta">
          {locale === "mn"
            ? "Таван Тансаг · Танин мэдэх тэмдэглэл"
            : "Tavan Tansag · An editorial guide"}
        </div>
      </div>
      {piece && (
        <figure>
          <div className="article-hero">
            <Image
              src={piece.image}
              alt={piece.name[locale]}
              fill
              loading="eager"
              sizes="(max-width: 760px) 90vw, 75vw"
            />
          </div>
          <figcaption>
            {piece.name[locale]} · {piece.id}.{" "}
            {locale === "mn"
              ? "Каталогийн эх зураг. Нийтлэл нь тухайн эдлэлийн гарал үүслийн баталгаа биш."
              : "Original catalog photograph. This article does not establish the provenance of the pictured piece."}
          </figcaption>
        </figure>
      )}
      <div className="article-body">
        {article.sections.map((section) => (
          <section key={section.title.en}>
            <h2>{section.title[locale]}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph[locale]}</p>
            ))}
          </section>
        ))}
        <div className="article-footer">
          <p>
            {locale === "mn"
              ? "Сонирхсон эдлэлийнхээ талаар асуух зүйл байна уу?"
              : "Would you like to ask about a particular piece?"}
          </p>
          <Link className="text-link" href={`/${locale}/inquiry`}>
            {locale === "mn" ? "Бидэнтэй холбогдох" : "Speak with us"}
            <Arrow />
          </Link>
        </div>
      </div>
    </article>
  );
}
