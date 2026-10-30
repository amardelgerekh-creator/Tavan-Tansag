import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { categories, categoryIds, subcategories, isLocale } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog-store";
import { t } from "@/lib/copy";
import { Arrow } from "@/components/icons";
import { ProductCard, Consultation } from "@/components/site";
import { ReelsGallery } from "@/components/reels-gallery";
import "@/app/home-categories.css";
import "@/app/home-experience.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    alternates: {
      canonical: "/" + locale,
      languages: { mn: "/mn", en: "/en" },
    },
  };
}
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const products = await getCatalog();
  const c = t(locale);
  const hero = products[0];
  const story = products[Math.min(8, products.length - 1)];
  const featured = [products[0], products[5], products[3]].filter(Boolean);
  return (
    <div className="home-experience">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-media">
          {hero && (
            <Image
              src={hero.image}
              alt={hero.name[locale]}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="100vw"
              className="home-hero-image"
            />
          )}
        </div>
        <div className="home-hero-content">
          <span className="eyebrow">{c.heroEyebrow}</span>
          <h1 id="home-hero-title"><span>{c.heroTitle[0]}</span><em>{c.heroTitle[1]}</em></h1>
          <p>{c.heroText}</p>
          <div className="home-hero-actions">
            <Link className="button home-hero-primary" href={`/${locale}/collection`}>{c.explore}<Arrow /></Link>
            <Link className="home-hero-inquiry" href={`/${locale}/inquiry`}>{c.enquire}<Arrow diagonal /></Link>
          </div>
        </div>
        <div className="home-hero-meta">
          <span className="home-hero-location">{c.since}<span aria-hidden="true"> / </span>ULAANBAATAR</span>
          {hero && <Link className="home-hero-piece" href={`/${locale}/products/${hero.slug}`}>
            <span className="home-hero-reference">{hero.id}</span><span>{hero.name[locale]}</span><Arrow diagonal />
          </Link>}
        </div>
      </section>
      <div className="craft-strip">
        <span>{locale === "mn" ? "ӨВ УЛАМЖЛАЛ" : "LIVING HERITAGE"}</span>
        <i />
        <span>{locale === "mn" ? "НАРИЙН УР ХИЙЦ" : "CONSIDERED CRAFT"}</span>
        <i />
        <span>
          {locale === "mn" ? "ӨӨРИЙН ГЭСЭН ОНЦЛОГ" : "INDIVIDUAL CHARACTER"}
        </span>
      </div>
      <section className="section container home-categories" aria-labelledby="home-categories-heading">
        <div className="section-heading"><div>
          <span className="eyebrow">{locale === "mn" ? "ТАВАН ТАНСАГИЙН ЦУГЛУУЛГА" : "THE TAVAN TANSAG COLLECTION"}</span>
          <h2 id="home-categories-heading">{locale === "mn" ? "Эдлэлээ төрлөөр нь сонгоорой." : "Discover the collection by category."}</h2>
        </div></div>
        <div className="home-category-grid">{categoryIds.map((category, index) => <article key={category}>
          <span className="home-category-number" aria-hidden="true">0{index + 1}</span>
          <h3><Link href={`/${locale}/collection?category=${category}`}>{categories[category][locale]}<Arrow diagonal /></Link></h3>
          <ul>{Object.entries(subcategories[category]).map(([key, label]) => <li key={key}><Link href={`/${locale}/collection?category=${category}&subcategory=${key}`}>{label[locale]}</Link></li>)}</ul>
        </article>)}</div>
      </section>
      <section className="section container featured">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{c.selected}</span>
            <h2>{c.selectionTitle}</h2>
            <p>{c.selectionText}</p>
          </div>
          <Link href={"/" + locale + "/collection"} className="text-link">
            {c.viewAll}
            <Arrow />
          </Link>
        </div>
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard product={p} locale={locale} key={p.id} />
          ))}
        </div>
      </section>
      <ReelsGallery locale={locale} />
      <section className="heritage-feature">
        <div className="heritage-photo">
          {story && (
            <Image
              src={story.image}
              alt={story.name[locale]}
              fill
              sizes="(max-width: 760px) 100vw, 50vw"
              className="heritage-image"
            />
          )}
          <span className="photo-label">{c.craft}</span>
        </div>
        <div className="heritage-copy">
          <span className="eyebrow">{c.journalEyebrow}</span>
          <h2>{c.journalTitle}</h2>
          <p>{c.journalText}</p>
          <Link href={"/" + locale + "/heritage"} className="text-link">
            {c.read}
            <Arrow />
          </Link>
          <span className="editorial-number" aria-hidden="true">
            ӨВ
          </span>
        </div>
      </section>
      <section className="section container about-preview">
        <span className="eyebrow">{c.since}</span>
        <h2>{c.aboutTitle}</h2>
        <p>{c.aboutText}</p>
        <Link className="text-link" href={"/" + locale + "/about"}>
          {c.about}
          <Arrow />
        </Link>
      </section>
      <Consultation locale={locale} />
    </div>
  );
}
