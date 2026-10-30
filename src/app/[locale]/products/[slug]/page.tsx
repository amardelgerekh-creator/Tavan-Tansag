import { notFound } from "next/navigation";
import Link from "next/link";
import { categories, subcategories, isLocale } from "@/lib/catalog";
import { articles } from "@/lib/articles";
import { productAvailability, productPrice, relatedProducts } from "@/lib/product-presentation";
import { getCatalog } from "@/lib/server/catalog-store";
import { getLocalCatalog } from "@/lib/server/local-catalog";
import { t } from "@/lib/copy";
import { Arrow } from "@/components/icons";
import { ProductCard } from "@/components/site";
import { ProductGallery } from "@/components/product-gallery";
import "@/app/product-enhancements.css";
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
  const mn = locale === "mn";
  const inquiryHref = `/${locale}/inquiry?piece=${p.id}`;
  const related = relatedProducts(products, p);
  const guides = articles.filter((article) => article.relevantCategories?.includes(p.category)).slice(0, 2);
  const confirmed = p.verificationStatus === "verified";
  const specifications = [
    [c.code, p.id],
    [c.material, p.material],
    [c.dimensions, p.dimensions],
    [mn ? "Нөхцөл байдал" : "Condition", p.condition],
    [mn ? "Жин" : "Weight", p.weight],
    [mn ? "Урлаач" : "Maker", p.maker],
    [mn ? "Хийсэн үе" : "Period", p.period],
    [c.availability, productAvailability(p, locale)],
  ];
  return (
    <div className="piece-experience">
      <section className="container product-page piece-page">
        <Link href={`/${locale}/collection?category=${p.category}${p.subcategory ? `&subcategory=${p.subcategory}` : ""}`} className="back-link">
          ← {c.back}
        </Link>
        <div className="product-detail-grid">
          <ProductGallery image={p.image} name={p.name[locale]} reference={p.id} locale={locale} />
          <div className="product-detail-copy">
            <span className="eyebrow">
              <Link href={`/${locale}/collection?category=${p.category}`}>{categories[p.category][locale]}</Link>
              {p.subcategory && subcategories[p.category][p.subcategory] && <> / <Link href={`/${locale}/collection?category=${p.category}&subcategory=${p.subcategory}`}>{subcategories[p.category][p.subcategory][locale]}</Link></>} · {p.id}
            </span>
            <h1>{p.name[locale]}</h1>
            <p className="product-description">{p.description[locale]}</p>
            <div className="piece-enquiry-block">
            <div className="detail-price">{productPrice(p, locale)}</div>
            <p className="piece-availability">{productAvailability(p, locale)}</p>
            <Link
              className="button button-dark"
              href={inquiryHref}
            >
              {c.enquire}
              <Arrow diagonal />
            </Link>
            <p className="detail-note">{c.productNote}</p>
            </div>
            <details className="piece-details" open>
              <summary>{c.details}<span aria-hidden="true">+</span></summary>
              {!confirmed && <p className="piece-review-note">{mn
                ? "Энэ бүртгэлийн үзүүлэлтүүдийг нягталж байна. Тодруулах мэдээллийг зөвлөхөөс асуугаарай."
                : "Details for this record are being reviewed. Our team can help clarify the information you need."}</p>}
              <dl className="spec-list">
                {specifications.map(([label, value]) => <div key={label}>
                  <dt>{label}</dt><dd>{value?.trim() || c.confirm}</dd>
                </div>)}
              </dl>
            </details>
          </div>
        </div>
      </section>
      <section className="container piece-notes" aria-label={mn ? "Хийц ба сонголт" : "Details and guidance"}>
        <div>
          <span className="eyebrow">01 / {mn ? "ОЙРООС ХАРАХ НЬ" : "A CLOSER LOOK"}</span>
          <h2>{mn ? "Зурагт харагдах хийц" : "Details in the photograph"}</h2>
          <p>{p.observations[locale] || p.description[locale]}</p>
          <p className="piece-small-note">{mn
            ? "Энэ тайлбар нь зургийн ажиглалт юм. Материал, сорьц, гарал үүслийг тусад нь нягтална."
            : "These are visual observations. Materials, purity and provenance require separate confirmation."}</p>
        </div>
        <div>
          <span className="eyebrow">02 / {mn ? "ТАНЫ СОНГОЛТОД" : "FOR YOUR SELECTION"}</span>
          <h2>{mn ? "Асуултаа хамтдаа тодруулъя" : "The details that matter to you"}</h2>
          <p>{mn
            ? "Хэмжээ, нэмэлт зураг, багтах дагалдах зүйл, бэлэглэх хугацаа эсвэл арчилгааны талаар асуугаарай. Сонгосон эдлэлийн код таны хүсэлтэд автоматаар орно."
            : "Ask about scale, additional photographs, included accessories, gifting dates or care. This piece’s reference will be included in your enquiry."}</p>
          <Link className="text-link" href={inquiryHref}>{c.enquire}<Arrow /></Link>
        </div>
      </section>
      {guides.length > 0 && <section className="container piece-reading">
        <div className="piece-reading-intro">
          <span className="eyebrow">{mn ? "ӨВ СОЁЛ БА УР ХИЙЦ" : "HERITAGE & CRAFT"}</span>
          <h2>{mn ? "Сонголтоо мэдлэгээр баяжуулаарай." : "A little understanding goes a long way."}</h2>
          <Link className="text-link" href={`/${locale}/heritage`}>{c.heritage}<Arrow /></Link>
        </div>
        <div className="piece-reading-links">{guides.map((guide) => <Link href={`/${locale}/heritage/${guide.slug}`} key={guide.slug}>
          <span>{guide.title[locale]}</span><Arrow diagonal />
          <p>{guide.summary[locale]}</p>
        </Link>)}</div>
      </section>}
      {related.length > 0 && <section className="section container">
        <div className="section-heading">
          <h2>{c.related}</h2>
        </div>
        <div className="product-grid">
          {related.map((x) => (
              <ProductCard key={x.id} product={x} locale={locale} />
            ))}
        </div>
      </section>}
      <div className="piece-mobile-contact">
        <span>{p.id}<small>{productPrice(p, locale)}</small></span>
        <Link className="button button-dark" href={inquiryHref}>{c.enquire}<Arrow diagonal /></Link>
      </div>
    </div>
  );
}
