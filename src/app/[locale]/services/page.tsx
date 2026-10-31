import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow } from "@/components/icons";
import { facebookUrl, isLocale, type Localized } from "@/lib/catalog";
import { ContactDetails } from "@/components/contact-details";
import "@/app/services.css";
import "@/app/editorial-experience.css";

const services: {
  purpose: "visit" | "gift" | "international" | "care";
  title: Localized;
  description: Localized;
  prepare: Localized;
  confirm: Localized;
  action: Localized;
}[] = [
  {
    purpose: "visit",
    title: { mn: "Эдлэлийг биеэр үзэх", en: "Arrange a viewing" },
    description: { mn: "Зургаас сонирхсон эдлэлээ ойроос үзэх хүсэлт үлдээгээрэй.", en: "Ask to take a closer look at a piece you have discovered in the collection." },
    prepare: { mn: "Эдлэлийн код, боломжтой өдөр болон цагаа бичнэ үү.", en: "Include the piece reference and your preferred day and time." },
    confirm: { mn: "Биеэр очихоос өмнө эдлэлийг үзүүлэх боломж, очих өдөр, цагаа ажилтантай баталгаажуулна.", en: "Before travelling, confirm viewing availability and the day and time of your visit with the team." },
    action: { mn: "Уулзалт хүсэх", en: "Request a viewing" },
  },
  {
    purpose: "gift",
    title: { mn: "Утга учиртай бэлэг", en: "Choose a meaningful gift" },
    description: { mn: "Хүлээн авах хүнд тохирох эдлэл, бэлэглэх хэлбэрээ хамт тодруулъя.", en: "Start a conversation about the recipient, the occasion and the right piece." },
    prepare: { mn: "Бэлэглэх үйл явдал, хэрэгтэй огноо, сонирхсон эдлэл, хүсвэл төсвийн хүрээгээ дурдана уу.", en: "Tell us the occasion, required date, preferred piece and, if helpful, your budget range." },
    confirm: { mn: "Бэлгийн савлагаа, дагалдах тайлбар, нэмэлт үйлчилгээний боломж болон төлбөрийг тухайн эдлэлээр нь тохиролцоно.", en: "Gift packaging, an accompanying note, additional services and any charges are agreed for the specific piece." },
    action: { mn: "Бэлгийн зөвлөгөө авах", en: "Ask about a gift" },
  },
  {
    purpose: "international",
    title: { mn: "Гадаадаас сонирхож байна уу?", en: "Enquiring from abroad?" },
    description: { mn: "Монгол болон Англи хэлээр хүсэлтээ үлдээж болно.", en: "Send your enquiry in English or Mongolian, wherever you are based." },
    prepare: { mn: "Улс, хот, эдлэлийн код, хэрэгтэй огноогоо бичнэ үү. Эхний хүсэлтэд гэрийн дэлгэрэнгүй хаяг шаардлагагүй.", en: "Include your country, city, piece reference and required date. Your full home address is not needed for the first enquiry." },
    confirm: { mn: "Хүргэлтийн боломж, зардал, хугацаа, шаардлагатай бичиг баримт болон хүлээн авах нөхцөлийг баталгаажуулсны дараа тохиролцоно.", en: "Delivery availability, costs, timing, required documentation and handover terms are confirmed before an arrangement is agreed." },
    action: { mn: "Гадаад хүсэлт илгээх", en: "Make an international enquiry" },
  },
  {
    purpose: "care",
    title: { mn: "Арчилгааг зөвөөс эхлэх", en: "Begin with the right care" },
    description: { mn: "Арчилгааны арга сонгохоос өмнө материал, бүрэлт, эдлэлийн байдлыг тодруулна.", en: "Establish the materials, finishes and condition before choosing a treatment." },
    prepare: { mn: "Эдлэлийн код, ажигласан асуудал, өмнө хэрэглэсэн цэвэрлэгээний бодис байвал дурдана уу.", en: "Mention the piece reference, the issue you have noticed and any cleaning products previously used." },
    confirm: { mn: "Нэмэлт зураг хэрэгтэй эсэх, тухайн эдлэлд тохирох зөвлөгөө болон мэргэжлийн хүнээр үзүүлэх шаардлагыг тодруулна.", en: "Discuss whether further photographs or a specialist assessment are needed for the individual piece." },
    action: { mn: "Арчилгааны талаар асуух", en: "Ask about care" },
  },
];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: locale === "mn" ? "Үйлчилгээ, холбоо барих" : "Services & contact",
    description: locale === "mn"
      ? "Эдлэл үзэх уулзалт, бэлэг сонгох, арчилгаа болон гадаадаас хүргэлт лавлах хүсэлтээ Монгол, Англи хэлээр үлдээгээрэй."
      : "Enquire about viewings, gifts, care or international delivery in English or Mongolian.",
    alternates: { canonical: `/${locale}/services`, languages: { mn: "/mn/services", en: "/en/services" } },
  };
}

export default async function Services({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const mn = locale === "mn";
  return (
    <div className="editorial-page services-editorial">
      <header className="container editorial-heading">
        <span className="eyebrow">{mn ? "ЗӨВЛӨГӨӨ БА ҮЙЛЧИЛГЭЭ" : "PERSONAL ADVICE & SERVICES"}</span>
        <h1>{mn ? "Сонголт бүрд тань\nзориулсан зөвлөгөө." : "Advice shaped\naround your choice."}</h1>
        <p>{mn ? "Биеэр үзэх, бэлэг сонгох, арчилгаа эсвэл гадаадаас лавлах. Танд хэрэгтэй мэдээллээс яриагаа эхэлье." : "A viewing, a gift, care advice or an enquiry from abroad. Let’s begin with what matters to you."}</p>
        <nav className="service-jump-links" aria-label={mn ? "Үйлчилгээний төрлүүд" : "Services on this page"}>
          {services.map((service) => <a key={service.purpose} href={`#${service.purpose}`}>{service.action[locale]}<Arrow /></a>)}
        </nav>
      </header>

      <section className="container services-editorial-options" aria-labelledby="service-options-heading">
        <div className="editorial-section-heading"><span className="eyebrow">{mn ? "ХАМТДАА ТОДРУУЛЪЯ" : "LET’S EXPLORE THE DETAILS"}</span><h2 id="service-options-heading">{mn ? "Юуны талаар ярилцах вэ?" : "How can we help?"}</h2></div>
        <div className="services-options">
          {services.map((service, index) => (
            <article key={service.purpose} id={service.purpose} className="service-option">
              <span className="service-number">0{index + 1}</span>
              <h3>{service.title[locale]}</h3>
              <p className="service-description">{service.description[locale]}</p>
              <p className="service-prepare">{service.prepare[locale]}</p>
              <Link className="text-link" href={`/${locale}/inquiry?purpose=${service.purpose}`}>{service.action[locale]}<Arrow /></Link>
              <details className="service-clarification">
                <summary>{mn ? "Урьдчилан мэдэх зүйл" : "Before we arrange the details"}</summary>
                <p>{service.confirm[locale]}</p>
                {service.purpose === "care" && <Link className="service-reading-link" href={`/${locale}/heritage/caring-for-your-piece`}>{mn ? "Арчилгааны тэмдэглэл унших" : "Read the care guide"} →</Link>}
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="container services-editorial-next" aria-labelledby="services-next-heading">
        <div className="editorial-section-heading"><span className="eyebrow">{mn ? "ЭНГИЙН ГУРВАН АЛХАМ" : "THREE SIMPLE STEPS"}</span><h2 id="services-next-heading">{mn ? "Хүсэлтээс дараагийн алхам хүртэл." : "From enquiry to your next step."}</h2></div>
        <ol className="house-principles">
          <li><span>01</span><h3>{mn ? "Хүсэлтээ үлдээх" : "Send your enquiry"}</h3><p>{mn ? "Эдлэлийн код, асуулт, холбоо барих мэдээллээ бичээрэй. Илгээсний дараа гарсан хүсэлтийн дугаарыг хадгалаарай." : "Share the piece reference, your questions and contact details. Keep the enquiry reference shown after you submit."}</p></li>
          <li><span>02</span><h3>{mn ? "Дэлгэрэнгүй ярилцах" : "Discuss the details"}</h3><p>{mn ? "Ажилтан таны сонгосон и-мэйл эсвэл утсаар холбогдож, эдлэлийн мэдээлэл, үнэ, бэлэн байдлыг тодруулна." : "The team will use your chosen email or phone to discuss the piece, its price and availability."}</p></li>
          <li><span>03</span><h3>{mn ? "Хамт тохиролцох" : "Agree what comes next"}</h3><p>{mn ? "Үзэх уулзалт, хүлээн авах арга болон холбогдох нөхцөлийг тусад нь тохиролцоно. Хүсэлт илгээх нь худалдан авалт, уулзалт эсвэл нөөцлөлтийн баталгаа биш." : "Arrange a viewing, handover and applicable terms with the team. An enquiry does not confirm a purchase, appointment or reservation."}</p></li>
        </ol>
      </section>

      <section className="container editorial-visit" aria-labelledby="contact-heading">
        <div>
          <span className="eyebrow">{mn ? "МОНГОЛ · АНГЛИ ХЭЛЭЭР" : "MONGOLIAN · ENGLISH"}</span>
          <h2 id="contact-heading">{mn ? "Бидэнтэй ярилцаарай." : "We would love to hear from you."}</h2>
          <p>{mn ? "Сонирхсон эдлэлээ дурдан холбогдоорой. Хугацаа чухал бол утсаар эсвэл Facebook хуудсаар хүсэлтийн дугаараа хэлж лавлаж болно." : "Let us know which piece you have in mind. If timing matters, call or contact our Facebook page with your enquiry reference."}</p>
          <div className="services-contact-actions">
            <Link href={`/${locale}/inquiry?purpose=general`} className="button button-dark">{mn ? "Хүсэлт үлдээх" : "Send an enquiry"}<Arrow /></Link>
            <a href={facebookUrl} target="_blank" rel="noreferrer" className="text-link">Facebook<Arrow diagonal /></a>
          </div>
          <p className="editorial-small-note">{mn ? "Улаанбаатарын цаг · UTC+8. Ирэх өдрөө урьдчилан баталгаажуулна уу." : "Ulaanbaatar time · UTC+8. Please confirm your visiting day in advance."}</p>
        </div>
        <ContactDetails locale={locale} />
      </section>
    </div>
  );
}
