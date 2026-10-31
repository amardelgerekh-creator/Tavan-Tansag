import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, categoryIds, facebookUrl, isLocale } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog-store";
import { Arrow } from "@/components/icons";
import { ContactDetails } from "@/components/contact-details";
import { t } from "@/lib/copy";
import "@/app/editorial-experience.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: locale === "en" ? "Our story" : "Бидний тухай",
    description: locale === "mn"
      ? "Таван Тансаг — Монгол өвийн үнэт эдлэлийн дэлгүүр. Бидний бэлгэдэл, цуглуулга болон Улаанбаатар дахь дэлгүүртэй танилцаарай."
      : "Discover Tavan Tansag, a Mongolian heritage jewelry house: our symbol, our collection and our store in Ulaanbaatar.",
    alternates: { canonical: `/${locale}/about`, languages: { mn: "/mn/about", en: "/en/about" } },
  };
}

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const mn = locale === "mn";
  const c = t(locale);
  const products = await getCatalog();
  const piece = products.find((product) => product.id === "TT-002") || products[0];
  return (
    <div className="editorial-page">
      <header className="container editorial-heading">
        <span className="eyebrow">TAVAN TANSAG / {mn ? "БИДНИЙ ТУХАЙ" : "OUR STORY"}</span>
        <h1>{c.footerLine}</h1>
        <p>{mn ? "Монгол урлалын хэлбэр, хийц, утга учрыг ойроос таних орон зай." : "A place to discover the form, detail and meaning of Mongolian craft."}</p>
      </header>

      <section className="container house-story" aria-labelledby="house-story-heading">
        <figure className="house-story-figure">
          <div className="house-story-image">
            {piece && <Image src={piece.image} alt={piece.name[locale]} fill loading="eager" sizes="(max-width: 760px) 90vw, 48vw" />}
          </div>
          {piece && <figcaption><span>{mn ? "ЦУГЛУУЛГААС" : "FROM THE COLLECTION"}</span><Link href={`/${locale}/products/${piece.slug}`}>{piece.id} <Arrow diagonal /></Link></figcaption>}
        </figure>
        <div className="house-story-copy">
          <span className="eyebrow">{mn ? "ӨВИЙГ ӨНӨӨДӨРТ" : "HERITAGE, IN THE PRESENT"}</span>
          <h2 id="house-story-heading">{mn ? "Эдлэлтэй хамт өвлөх үнэ цэнэ." : "Something to carry forward."}</h2>
          <p>{c.aboutText}</p>
          <p>{mn ? "Эрэгтэй, эмэгтэй гоёл, мөнгөн эдлэл, морины хэрэглэл, хөөрөг — манай цуглуулгын таван чиглэл. Өөртөө сонгох, бэлэглэх, цуглуулах эдлэлээ бодит зургаас нь ажиглаж, сонирхсон зүйлээ биднээс асуугаарай." : "Men’s and women’s accessories, silverware, horse accessories and snuff bottles form the five parts of our collection. Explore the original photographs, whether choosing for yourself, a gift or a collection, and ask us about the details that catch your eye."}</p>
          <Link href={`/${locale}/collection`} className="text-link">{mn ? "Цуглуулгатай танилцах" : "Explore the collection"}<Arrow /></Link>
          <p className="house-source"><a href={facebookUrl} target="_blank" rel="noreferrer">{mn ? "2010 оноос · Манай Facebook танилцуулга" : "Since 2010 · Our Facebook introduction"}<Arrow diagonal /></a></p>
        </div>
      </section>

      <section className="house-symbol" aria-labelledby="house-symbol-heading">
        <div className="container house-symbol-inner">
          <div className="house-symbol-mark"><img src={`/images/brand/logo-${locale}.svg`} width="608" height="383" alt={mn ? "Таван Тансагийн бэлгэдэл" : "The Tavan Tansag symbol"} loading="lazy" /></div>
          <div className="house-symbol-copy">
            <span className="eyebrow">{mn ? "ТАВАН ДҮРС. ТАСРАЛТГҮЙ ХОЛБОО." : "FIVE FORMS. ONE CONTINUOUS CONNECTION."}</span>
            <h2 id="house-symbol-heading">{mn ? "Бэлгэдэлд шингэсэн өв." : "Heritage in our symbol."}</h2>
            <p>{mn ? "Логоны сүлжилдсэн таван дөрвөлжин нь Монголын таван хошуу малыг бэлгэдэнэ. Тэдгээрийн тасралтгүй холбоос нь өв соёл, үнэ цэнэ үеэс үед үргэлжлэх утгыг илэрхийлдэг." : "The five interwoven squares in our logo symbolize Mongolia’s five traditional livestock: horses, camels, cattle, sheep and goats. Their continuous connection expresses heritage and value passed from one generation to the next."}</p>
            <p>{mn ? "Дулаан хүрэл өнгө, даруу дүрслэл. Бидний эрхэмлэх зүйлсийг илэрхийлэх цөөн, тодорхой хэлбэр." : "Warm bronze, a restrained palette and a clear, connected form give that idea its visual expression."}</p>
          </div>
        </div>
      </section>

      <section className="container house-approach" aria-labelledby="house-approach-heading">
        <div className="editorial-section-heading"><span className="eyebrow">{mn ? "БИДНИЙ ХАНДЛАГА" : "OUR APPROACH"}</span><h2 id="house-approach-heading">{mn ? "Ойроос харж. Ойлгож сонгох." : "Look closely. Choose thoughtfully."}</h2></div>
        <div className="house-principles">
          <article><span>01</span><h3>{mn ? "Бодит дүрслэл" : "Original photography"}</h3><p>{mn ? "Эдлэлийн хэлбэр, чимэглэл, хийцийн нарийн ширийнийг бодит зургаас нь танилцуулна. Нэмэлт өнцөг, ойрын зураг хэрэгтэй бол хүсэлтдээ дурдаарай." : "Original photographs let you observe the shape, ornament and construction. If a different angle or close-up would help, mention it in your enquiry."}</p></article>
          <article><span>02</span><h3>{mn ? "Нягталсан мэдээлэл" : "Considered information"}</h3><p>{mn ? "Материал, хэмжээ, гарал үүсэл, үнэ болон бэлэн байдлыг эдлэл тус бүрээр тодруулна. Баталгаажаагүй мэдээллийг таамгаар нөхөхгүй." : "Materials, dimensions, origin, price and availability are checked for each piece. Details that have not been verified remain open questions."}</p></article>
          <article><span>03</span><h3>{mn ? "Танд тохирох сонголт" : "A personal conversation"}</h3><p>{mn ? "Хэрэглээ, бэлэглэх учир, сонирхлоо хуваалцаарай. Эдлэлийн мэдээлэл, нөхцөлийг тодруулж, дараагийн алхмаа хамт тохиролцоно." : "Share the purpose, occasion or interest behind your choice. We can discuss the details and terms, then agree the next step together."}</p></article>
        </div>
        <div className="house-category-links">{categoryIds.map((category) => <Link key={category} href={`/${locale}/collection?category=${category}`}>{categories[category][locale]}<Arrow diagonal /></Link>)}</div>
      </section>

      <section className="container editorial-visit" aria-labelledby="house-visit-heading">
        <div>
          <span className="eyebrow">ULAANBAATAR, MONGOLIA</span>
          <h2 id="house-visit-heading">{mn ? "Дэлгүүрт тухлан танилцаарай." : "Take a closer look, in person."}</h2>
          <p>{mn ? "Жуулчны гудамж дахь Таван Тансагт зочлоорой. Сонирхсон эдлэлээ үзэх боломж, ирэх өдөр цагаа урьдчилан баталгаажуулна уу." : "Visit Tavan Tansag on Juulchin Street. Please confirm the availability of the piece you wish to see and your visiting day and time before travelling."}</p>
          <Link href={`/${locale}/inquiry?purpose=visit`} className="button button-dark">{mn ? "Уулзалт хүсэх" : "Request a viewing"}<Arrow /></Link>
          <Link href={`/${locale}/services`} className="text-link">{mn ? "Үйлчилгээтэй танилцах" : "Explore our services"}<Arrow /></Link>
        </div>
        <ContactDetails locale={locale} />
      </section>
    </div>
  );
}
