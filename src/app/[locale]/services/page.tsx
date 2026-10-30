import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow } from "@/components/icons";
import { facebookUrl, isLocale, type Localized } from "@/lib/catalog";
import "@/app/services.css";

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
    confirm: { mn: "Биеэр очихоос өмнө эдлэлийг үзүүлэх боломж, уулзах хаяг, цагийг ажилтантай баталгаажуулна.", en: "Before travelling, confirm viewing availability, the exact meeting address and time with the team." },
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
    <div className="container section services-page">
      <header className="services-intro">
        <div>
          <span className="eyebrow">{mn ? "ТАНЫ СОНГОЛТЫН ДАРААГИЙН АЛХАМ" : "THE NEXT STEP IN YOUR CHOICE"}</span>
          <h1>{mn ? "Эдлэлээс эхлэх яриа." : "A conversation around a piece."}</h1>
        </div>
        <p>{mn
          ? "Сонирхсон эдлэлийнхээ талаар асуух, уулзалт хүсэх, бэлэг сонгохдоо бидэнтэй холбогдоорой. Үнэ, бэлэн байдал болон үйлчилгээний нөхцөлийг хамт тодруулна."
          : "Ask about a piece, request a viewing or find a gift. Together we can clarify availability, price and the details that matter to you."}</p>
      </header>

      <section className="services-contact" aria-labelledby="contact-heading">
        <div>
          <span className="eyebrow">{mn ? "ХОЛБОО БАРИХ" : "GET IN TOUCH"}</span>
          <h2 id="contact-heading">{mn ? "Танд тохирох сувгаа сонгоорой." : "Choose how to reach us."}</h2>
          <div className="services-contact-actions">
            <Link href={`/${locale}/inquiry?purpose=general`} className="button button-dark">{mn ? "Хүсэлт үлдээх" : "Send an enquiry"}<Arrow /></Link>
            <a href={facebookUrl} target="_blank" rel="noreferrer" className="text-link">Facebook<Arrow diagonal /></a>
          </div>
        </div>
        <dl>
          <div><dt>{mn ? "Байршил" : "Location"}</dt><dd>{mn ? "Улаанбаатар, Монгол" : "Ulaanbaatar, Mongolia"}</dd></div>
          <div><dt>{mn ? "Харилцах хэл" : "Enquiry languages"}</dt><dd>{mn ? "Монгол · Англи" : "Mongolian · English"}</dd></div>
          <div><dt>{mn ? "Цагийн бүс" : "Time zone"}</dt><dd>{mn ? "Улаанбаатар · UTC+8" : "Ulaanbaatar · UTC+8"}</dd></div>
          <div><dt>{mn ? "Биеэр ирэхийн өмнө" : "Before your visit"}</dt><dd>{mn ? "Уулзах хаяг, өдөр, цагийг ажилтантай урьдчилан баталгаажуулна уу." : "Confirm the meeting address, day and time with the team before travelling."}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="service-options-heading">
        <h2 id="service-options-heading" className="services-options-title">{mn ? "Юуны талаар ярилцах вэ?" : "How can we help?"}</h2>
        <div className="services-options">
          {services.map((service, index) => (
            <article key={service.purpose} id={service.purpose} className="service-option">
              <span className="service-number">0{index + 1}</span>
              <h3>{service.title[locale]}</h3>
              <p className="service-description">{service.description[locale]}</p>
              <dl>
                <div><dt>{mn ? "Хүсэлтдээ дурдах" : "What to include"}</dt><dd>{service.prepare[locale]}</dd></div>
                <div><dt>{mn ? "Хамт тодруулах" : "What we will clarify"}</dt><dd>{service.confirm[locale]}</dd></div>
              </dl>
              <Link className="text-link" href={`/${locale}/inquiry?purpose=${service.purpose}`}>{service.action[locale]}<Arrow /></Link>
              {service.purpose === "care" && <Link className="service-reading-link" href={`/${locale}/heritage/caring-for-your-piece`}>{mn ? "Арчилгааны тэмдэглэл унших" : "Read the care guide"} →</Link>}
            </article>
          ))}
        </div>
      </section>

      <section className="services-next" aria-labelledby="services-next-heading">
        <div>
          <span className="eyebrow">{mn ? "ХҮСЭЛТИЙН ДАРАА" : "AFTER YOUR ENQUIRY"}</span>
          <h2 id="services-next-heading">{mn ? "Дараа нь юу болох вэ?" : "What happens next?"}</h2>
        </div>
        <ol>
          <li>{mn ? "Хүсэлт хадгалагдсаны дараа дэлгэц дээр гарсан дугаарыг тэмдэглэж авна." : "Keep the reference shown on screen once your enquiry is saved."}</li>
          <li>{mn ? "Ажилтан таны сонгосон и-мэйл эсвэл утсаар холбогдож, шаардлагатай мэдээллийг тодруулна." : "A member of the team can contact you by your chosen email or phone to clarify the details."}</li>
          <li>{mn ? "Эдлэл, үнэ, бэлэн байдал болон хүлээн авах нөхцөлийг тохиролцож байж дараагийн алхмаа шийднэ." : "Agree the piece, price, availability and handover terms before deciding the next step."}</li>
        </ol>
        <p>{mn ? "Хүсэлт нь худалдан авалт, уулзалт эсвэл нөөцлөлтийн баталгаа биш. Яаралтай зүйл байвал Facebook хуудсаар хүсэлтийн дугаараа дурдаж холбогдоорой." : "An enquiry does not confirm a purchase, appointment or reservation. If your enquiry is time-sensitive, you can also contact the Facebook page with your reference."}</p>
      </section>
    </div>
  );
}
