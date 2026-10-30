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
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow gold">{c.heroEyebrow}</span>
          <h1>
            {c.heroTitle[0]}
            <br />
            <em>{c.heroTitle[1]}</em>
          </h1>
          <p>{c.heroText}</p>
          <Link
            className="button button-gold"
            href={"/" + locale + "/collection"}
          >
            {c.explore}
            <Arrow />
          </Link>
          <div className="hero-bottom">
            <span>
              {products.length ? "01" : "00"} /{" "}
              {String(products.length).padStart(2, "0")}
            </span>
            <span>{c.since} · ULAANBAATAR</span>
          </div>
        </div>
        <div className="hero-art">
          {hero && (
            <Image
              src={hero.image}
              alt={hero.name[locale]}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 760px) 100vw, 55vw"
              className="hero-image"
            />
          )}
          <div className="hero-art-caption">
            <span>{hero?.name[locale]}</span>
            {hero && (
              <Link
                href={"/" + locale + "/products/" + hero?.slug}
                aria-label={c.viewPiece}
              >
                <Arrow diagonal />
              </Link>
            )}
          </div>
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
    </>
  );
}
