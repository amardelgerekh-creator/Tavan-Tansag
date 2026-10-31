import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/lib/articles";
import { categories, categoryIds, isLocale } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog-store";
import { Arrow } from "@/components/icons";
import "@/app/editorial-experience.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: locale === "en" ? "Heritage & craft" : "Өв соёл, ур хийц",
    description: locale === "mn"
      ? "Эдлэлээ ойлгож сонгох, түүхийг нь таних, зөв арчлах тухай Таван Тансагийн тэмдэглэлүүд."
      : "Notes from Tavan Tansag on choosing a piece, understanding its story and caring for it thoughtfully.",
    alternates: { canonical: `/${locale}/heritage`, languages: { mn: "/mn/heritage", en: "/en/heritage" } },
  };
}

export default async function Heritage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const mn = locale === "mn";
  const products = await getCatalog();
  const [lead, ...remaining] = articles;
  const leadPiece = products.find((product) => product.id === `TT-${String(lead.imageIndex + 1).padStart(3, "0")}`) || products[lead.imageIndex] || products[0];
  return (
    <div className="editorial-page journal-editorial">
      <header className="container editorial-heading">
        <span className="eyebrow">{mn ? "ТАВАН ТАНСАГИЙН ТЭМДЭГЛЭЛ" : "THE TAVAN TANSAG JOURNAL"}</span>
        <h1>{mn ? "Өвийг таних,\nүнэ цэнийг ойлгох." : "Look closer.\nDiscover more."}</h1>
        <p>{mn ? "Эдлэл сонгох асуултаас эхлээд түүхийг нь таних, зөв арчлах хүртэл. Ажиглах, суралцах, эргэн унших тэмдэглэлүүд." : "From the first questions to an object’s story and its care. Notes to explore, learn from and return to."}</p>
      </header>

      <section className="container journal-lead" aria-labelledby="journal-lead-heading">
        <Link href={`/${locale}/heritage/${lead.slug}`} className="journal-lead-image" aria-label={lead.title[locale]}>
          {leadPiece && <Image src={leadPiece.image} alt={leadPiece.name[locale]} fill loading="eager" sizes="(max-width: 760px) 90vw, 52vw" />}
        </Link>
        <div className="journal-lead-copy">
          <span className="eyebrow">{lead.category[locale]}</span>
          <h2 id="journal-lead-heading"><Link href={`/${locale}/heritage/${lead.slug}`}>{lead.title[locale]}</Link></h2>
          <p>{lead.summary[locale]}</p>
          <div className="journal-reading-row"><Link className="text-link" href={`/${locale}/heritage/${lead.slug}`}>{mn ? "Тэмдэглэл унших" : "Read the note"}<Arrow /></Link><span>{lead.readingMinutes} {mn ? "минут уншина" : "minute read"}</span></div>
        </div>
      </section>

      <section className="container journal-stories" aria-labelledby="journal-stories-heading">
        <div className="editorial-section-heading"><span className="eyebrow">{mn ? "ТАНИН МЭДЭХ" : "FURTHER READING"}</span><h2 id="journal-stories-heading">{mn ? "Эдлэлийн цаадах утга учир." : "Beyond the first impression."}</h2></div>
        <div className="journal-story-grid">
          {remaining.map((article) => {
            const piece = products.find((product) => product.id === `TT-${String(article.imageIndex + 1).padStart(3, "0")}`) || products[article.imageIndex] || products[0];
            return (
              <article className="journal-story" key={article.slug}>
                <Link href={`/${locale}/heritage/${article.slug}`} className="journal-story-image" aria-label={article.title[locale]}>
                  {piece && <Image src={piece.image} alt={piece.name[locale]} fill sizes="(max-width: 760px) 90vw, 30vw" />}
                </Link>
                <div className="journal-story-copy">
                  <span className="eyebrow">{article.category[locale]}</span>
                  <h3><Link href={`/${locale}/heritage/${article.slug}`}>{article.title[locale]}</Link></h3>
                  <p>{article.summary[locale]}</p>
                  <div className="journal-reading-row"><Link className="text-link" href={`/${locale}/heritage/${article.slug}`}>{mn ? "Унших" : "Read the note"}<Arrow /></Link><span>{article.readingMinutes} {mn ? "минут уншина" : "minute read"}</span></div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="container journal-to-collection" aria-labelledby="journal-collection-heading">
        <div><span className="eyebrow">{mn ? "ТЭМДЭГЛЭЛЭЭС ЦУГЛУУЛГА РУУ" : "FROM THE JOURNAL TO THE COLLECTION"}</span><h2 id="journal-collection-heading">{mn ? "Одоо эдлэлээ ойроос хараарай." : "See the details for yourself."}</h2><p>{mn ? "Сонирхсон төрлөө сонгож, зураг, тайлбартай нь танилцаарай. Тухайн эдлэлийн материал, гарал үүсэл, нөхцөлийг зөвлөхтэй нягтална." : "Choose a category and explore the photographs and notes. Our team can help clarify the material, origin and condition of an individual piece."}</p></div>
        <div className="journal-category-links">{categoryIds.map((category) => <Link key={category} href={`/${locale}/collection?category=${category}`}>{categories[category][locale]}<Arrow diagonal /></Link>)}</div>
      </section>
    </div>
  );
}
