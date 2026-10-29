import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleBySlug, articles } from "@/lib/articles";
import { isLocale } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog-store";
import { Arrow } from "@/components/icons";
import { ProductCard } from "@/components/site";
import "@/app/heritage-enhancements.css";

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
  const products = await getCatalog();
  const piece = products[article.imageIndex] || products[0];
  const related = products
    .filter((product) => article.relevantCategories.includes(product.category) && (!piece || product.category === piece.category))
    .slice(0, 3);
  return (
    <article className="container section heritage-article">
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
          {" · "}{article.readingMinutes} {locale === "mn" ? "минут" : "min read"}
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
        <aside className="heritage-takeaways" aria-labelledby="takeaway-heading">
          <span className="eyebrow">{locale === "mn" ? "ГОЛ САНАА" : "AT A GLANCE"}</span>
          <h2 id="takeaway-heading">{locale === "mn" ? "Уншихын өмнө" : "Before you begin"}</h2>
          <ul>{article.takeaways.map((takeaway) => <li key={takeaway.en}>{takeaway[locale]}</li>)}</ul>
        </aside>
        {article.sections.map((section) => (
          <section key={section.title.en}>
            <h2>{section.title[locale]}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph[locale]}</p>
            ))}
          </section>
        ))}
        {!!article.sources?.length && (
          <section className="heritage-sources">
            <h2>{locale === "mn" ? "Эх сурвалж, дэлгэрүүлж унших" : "Sources & further reading"}</h2>
            <ul>{article.sources.map((source) => (
              <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title[locale]} ↗</a></li>
            ))}</ul>
            <p>{locale === "mn"
              ? "Эдгээр эх сурвалж нь ерөнхий тайлбарыг дэмжинэ. Каталогт буй эдлэлийн гарал үүсэл, насжилт, материалын баталгаа болохгүй."
              : "These sources support the general context. They do not certify the origin, age or material of the pieces in our catalog."}</p>
          </section>
        )}
        <div className="article-footer">
          <p>
            {locale === "mn"
              ? "Сонирхсон эдлэлийнхээ талаар асуух зүйл байна уу?"
              : "Would you like to ask about a particular piece?"}
          </p>
          <Link className="text-link" href={`/${locale}/inquiry${piece ? `?piece=${piece.id}` : ""}`}>
            {locale === "mn" ? "Бидэнтэй холбогдох" : "Speak with us"}
            <Arrow />
          </Link>
          <p>{locale === "mn" ? "Зөвлөгөөний хүсэлт нь худалдан авалт эсвэл эдлэл хадгалуулах баталгаа биш. Үнэ, бэлэн байдал, дараагийн алхмыг хамт тодруулна." : "An enquiry is not a purchase or a reservation. Price, availability and the next step are agreed with the team."}</p>
        </div>
      </div>
      {related.length > 0 && <section className="heritage-related">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{locale === "mn" ? "ТЭМДЭГЛЭЛЭЭС КАТАЛОГ РУУ" : "FROM THE JOURNAL TO THE COLLECTION"}</span>
            <h2>{locale === "mn" ? "Ойроос танилцах эдлэлүүд" : "Pieces to look at closely"}</h2>
          </div>
          <Link className="text-link" href={`/${locale}/collection`}>{locale === "mn" ? "Бүх эдлэл" : "View all pieces"}<Arrow /></Link>
        </div>
        <div className="product-grid">{related.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div>
      </section>}
    </article>
  );
}
