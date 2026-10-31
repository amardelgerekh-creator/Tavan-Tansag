import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { categories, categoryIds, isLocale, type Category } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog-store";
import { articles } from "@/lib/articles";
import { businessDetails } from "@/lib/business";
import { t } from "@/lib/copy";
import { Arrow } from "@/components/icons";
import { ProductCard } from "@/components/site";
import { ContactIcon } from "@/components/contact-icon";
import { ReelsGallery } from "@/components/reels-gallery";
import "@/app/home-categories.css";
import "@/app/home-experience.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { alternates: { canonical: "/" + locale, languages: { mn: "/mn", en: "/en" } } };
}

// Stable editorial references select only from the currently public catalog.
const categoryReferences: Record<Category, string> = {
  men: "TT-011", women: "TT-014", silverware: "TT-008", horse: "TT-004", "snuff-bottles": "TT-018",
};

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const products = await getCatalog();
  const c = t(locale);
  const mn = locale === "mn";
  const hero = products.find((p) => p.id === "TT-001") ?? products.find((p) => p.category === "horse") ?? products[0];
  const story = products.find((p) => p.id === "TT-010") ?? products.find((p) => p.category === "silverware") ?? products.find((p) => p.id !== hero?.id) ?? hero;
  const featured = ([['snuff-bottles', 'TT-019'], ['women', 'TT-015'], ['men', 'TT-013']] as const)
    .flatMap(([category, id]) => {
      const piece = products.find((p) => p.id === id && p.category === category) ?? products.find((p) => p.category === category);
      return piece ? [piece] : [];
    });
  return <div className="home-experience">
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero-content">
        <span className="eyebrow">{c.heroEyebrow}</span>
        <h1 id="home-hero-title"><span>{c.heroTitle[0]}</span><em>{c.heroTitle[1]}</em></h1>
        <p>{mn ? "Гоёл чимэглэлээс морины хэрэглэл хүртэл. Монгол урлалын хэлбэр, хээ, нарийн хийцтэй өөрийн хэмнэлээр танилцаарай." : "From personal adornment to equestrian pieces. Discover the forms, patterns and considered details of Mongolian craft."}</p>
        <div className="home-hero-actions">
          <Link className="button home-hero-primary" href={`/${locale}/collection`}>{c.explore}<Arrow /></Link>
          <Link className="home-hero-inquiry" href={`/${locale}/about`}>{mn ? "Таван Тансагийн тухай" : "Discover our story"}<Arrow diagonal /></Link>
        </div>
        <span className="home-hero-location">ULAANBAATAR, MONGOLIA <span aria-hidden="true">—</span> {c.since}</span>
      </div>
      <div className="home-hero-media">
        {hero && <><Image src={hero.image} alt={hero.name[locale]} fill loading="eager" fetchPriority="high" sizes="(max-width: 760px) 100vw, 56vw" className="home-hero-image" />
          <Link className="home-hero-piece" href={`/${locale}/products/${hero.slug}`}><span><span className="home-hero-reference">{hero.id} / {mn ? "ОЙРООС ХАРАХ" : "A CLOSER LOOK"}</span><span>{hero.name[locale]}</span></span><Arrow diagonal /></Link></>}
      </div>
    </section>
    <nav className="home-chapters" aria-label={mn ? "Нүүр хуудасны хэсгүүд" : "Explore this page"}>
      <a href="#collections"><span aria-hidden="true">01</span>{mn ? "Цуглуулга" : "The collection"}<Arrow /></a>
      <a href="#heritage"><span aria-hidden="true">02</span>{mn ? "Өв соёл" : "Heritage & stories"}<Arrow /></a>
      <a href="#visit"><span aria-hidden="true">03</span>{mn ? "Дэлгүүрт зочлох" : "Visit Tavan Tansag"}<Arrow /></a>
    </nav>
    <section className="section container home-categories" id="collections" aria-labelledby="home-categories-heading">
      <div className="section-heading"><div><span className="eyebrow">{mn ? "ТАВАН ТАНСАГИЙН ЦУГЛУУЛГА" : "THE COLLECTION"}</span><h2 id="home-categories-heading">{mn ? "Таван төрөл. Өөрийн гэсэн сонголт." : "Five collections. Your own discovery."}</h2></div><Link href={`/${locale}/collection`} className="text-link">{c.viewAll}<Arrow /></Link></div>
      <div className="home-category-grid">{categoryIds.map((category, index) => {
        const piece = products.find((p) => p.id === categoryReferences[category] && p.category === category) ?? products.find((p) => p.category === category);
        return <Link className="home-category-card" key={category} href={`/${locale}/collection?category=${category}`}>
          <div className="home-category-image">{piece ? <Image src={piece.image} alt={piece.name[locale]} fill sizes="(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 19vw" /> : <span className="home-category-placeholder" aria-hidden="true">0{index + 1}</span>}</div>
          <div className="home-category-label"><span className="home-category-number" aria-hidden="true">0{index + 1}</span><h3>{categories[category][locale]}</h3><Arrow diagonal /></div>
        </Link>;
      })}</div>
    </section>
    {featured.length > 0 && <section className="home-selection" aria-labelledby="home-selection-title"><div className="container section">
      <div className="section-heading"><div><span className="eyebrow">{c.selected}</span><h2 id="home-selection-title">{mn ? "Нарийн хийцэд татагдах нь." : "Drawn to the details."}</h2><p>{mn ? "Хэлбэр, өнгө, хээний ялгааг ажиглаад, сэтгэлд ойр эдлэлийнхээ тухай асуугаарай." : "Take in the shapes, colours and patterns. Ask us about the piece that stays with you."}</p></div><Link href={`/${locale}/collection`} className="text-link">{c.viewAll}<Arrow /></Link></div>
      <div className="product-grid">{featured.map((p) => <ProductCard product={p} locale={locale} key={p.id} />)}</div>
      <p className="home-selection-note">{mn ? "Үнэ, материал болон бэлэн байдлыг эдлэл тус бүрээр зөвлөхөөс тодруулна уу." : "Our team will confirm the price, materials and availability of each piece."}</p>
    </div></section>}
    <section className={`section container home-journal${story ? "" : " home-journal-text"}`} id="heritage" aria-labelledby="home-journal-heading">
      {story && <div className="home-journal-visual"><Link href={`/${locale}/products/${story.slug}`} aria-label={story.name[locale]}><Image src={story.image} alt={story.name[locale]} fill sizes="(max-width: 760px) 100vw, 46vw" /><span>{story.id}<Arrow diagonal /></span></Link></div>}
      <div className="home-journal-copy"><span className="eyebrow">{c.journalEyebrow}</span><h2 id="home-journal-heading">{mn ? "Харах. Таних. Өвлүүлэх." : "Look closer. Understand more."}</h2><p>{mn ? "Эдлэлийг сонгохдоо зөвхөн дүр төрхийг нь бус, асуух зүйлээ ч олж хараарай." : "A thoughtful choice begins with a closer look — and the right questions."}</p>
        <div className="home-journal-links">{articles.slice(0, 3).map((article, index) => <Link href={`/${locale}/heritage/${article.slug}`} key={article.slug}><span className="home-journal-number" aria-hidden="true">0{index + 1}</span><div><h3>{article.title[locale]}</h3><span className="home-reading-time">{article.readingMinutes} {mn ? "мин унших" : "min read"}</span></div><Arrow diagonal /></Link>)}</div>
        <Link className="text-link" href={`/${locale}/heritage`}>{mn ? "Өв соёлын тэмдэглэлүүд" : "Explore the journal"}<Arrow /></Link>
      </div>
    </section>
    <ReelsGallery locale={locale} />
    <section className="home-visit" id="visit" aria-labelledby="home-visit-heading"><div className="container home-visit-inner">
      <div className="home-visit-intro"><span className="eyebrow gold">{mn ? "ЖУУЛЧНЫ ГУДАМЖ · УЛААНБААТАР" : "JUULCHIN STREET · ULAANBAATAR"}</span><h2 id="home-visit-heading">{mn ? "Ойроос үзэж,\nтайван ярилцъя." : "See it up close.\nMake it a conversation."}</h2><p>{mn ? "Сонирхсон эдлэлээ үзэх өдөр, цагаа урьдчилан тохироорой. Бэлэг сонгох, нэмэлт зураг авах болон бусад асуултаар ч бидэнд хандаж болно." : "Arrange a time to view a piece in person. We can also help with questions about gifting, further photographs or your next discovery."}</p><Link href={`/${locale}/inquiry?purpose=visit`} className="button button-light">{mn ? "Зочлох хүсэлт илгээх" : "Request a visit"}<Arrow diagonal /></Link></div>
      <div className="home-visit-details">
        <div><ContactIcon kind="location"/><div><span className="eyebrow gold">{mn ? "МАНАЙ ДЭЛГҮҮР" : "FIND US"}</span><p>{businessDetails.address[locale]}</p></div></div>
        <div><ContactIcon kind="clock"/><div><span className="eyebrow gold">{mn ? "АЖИЛЛАХ ЦАГ" : "OPENING HOURS"}</span><p>{businessDetails.hours}</p><small>{mn ? "Улаанбаатарын цагаар. Ирэх өдрөө урьдчилан лавлана уу." : "Ulaanbaatar time. Please confirm your visiting day."}</small></div></div>
        <a href={`tel:${businessDetails.phone}`}><ContactIcon kind="phone"/><span>{businessDetails.phoneDisplay}</span><Arrow diagonal /></a>
        <Link href={`/${locale}/services`} className="text-link">{mn ? "Зөвлөгөө ба үйлчилгээ" : "Advice & services"}<Arrow /></Link>
      </div>
    </div></section>
  </div>;
}
