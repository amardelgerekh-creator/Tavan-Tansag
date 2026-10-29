import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { categories, isLocale } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog-store";
import { getLocalCatalog } from "@/lib/server/local-catalog";
import { t } from "@/lib/copy";
import { Arrow } from "@/components/icons";
import { ProductCard } from "@/components/site";
export function generateStaticParams() {
  return ["mn", "en"].flatMap((locale) =>
    getLocalCatalog().map((p) => ({ locale, slug: p.slug })),
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const products = await getCatalog();
  const p = products.find((p) => p.slug === slug);
  if (!p) return {};
  const indexable =
    process.env.SITE_INDEXABLE === "true" &&
    p.publicationStatus === "published" &&
    p.verificationStatus === "verified";
  return {
    title: p.name[locale],
    description: p.description[locale],
    robots: { index: indexable, follow: indexable },
    alternates: {
      canonical: "/" + locale + "/products/" + slug,
      languages: { mn: "/mn/products/" + slug, en: "/en/products/" + slug },
    },
    openGraph: { images: [p.image] },
  };
}
export default async function Product({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const products = await getCatalog();
  const p = products.find((p) => p.slug === slug);
  if (!p) notFound();
  const c = t(locale);
  return (
    <>
      <section className="container product-page">
        <Link href={"/" + locale + "/collection"} className="back-link">
          ← {c.back}
        </Link>
        <div className="product-detail-grid">
          <div className="product-detail-image">
            <Image
              src={p.image}
              alt={p.name[locale]}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 760px) 100vw, 55vw"
            />
          </div>
          <div className="product-detail-copy">
            <span className="eyebrow">
              {categories[p.category]?.[locale]} · {p.id}
            </span>
            <h1>{p.name[locale]}</h1>
            <p className="product-description">{p.description[locale]}</p>
            <div className="detail-price">{c.price}</div>
            <Link
              className="button button-dark"
              href={"/" + locale + "/inquiry?piece=" + p.id}
            >
              {c.enquire}
              <Arrow diagonal />
            </Link>
            <p className="detail-note">{c.productNote}</p>
            <dl className="spec-list">
              <div>
                <dt>{c.code}</dt>
                <dd>{p.id}</dd>
              </div>
              <div>
                <dt>{c.material}</dt>
                <dd>{p.material || c.confirm}</dd>
              </div>
              <div>
                <dt>{c.dimensions}</dt>
                <dd>{p.dimensions || c.confirm}</dd>
              </div>
              <div>
                <dt>{c.availability}</dt>
                <dd>{c.confirm}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <h2>{c.related}</h2>
        </div>
        <div className="product-grid">
          {products
            .filter((x) => x.id !== p.id)
            .slice(0, 3)
            .map((x) => (
              <ProductCard key={x.id} product={x} locale={locale} />
            ))}
        </div>
      </section>
    </>
  );
}
