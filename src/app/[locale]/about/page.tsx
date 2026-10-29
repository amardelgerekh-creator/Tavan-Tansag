import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { facebookUrl, isLocale } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog-store";
import { Arrow } from "@/components/icons";
import { Consultation } from "@/components/site";
import { t } from "@/lib/copy";
import "@/app/heritage-enhancements.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Our story" : "Бидний тухай",
    alternates: {
      canonical: `/${locale}/about`,
      languages: { mn: "/mn/about", en: "/en/about" },
    },
  };
}

export default async function About({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = t(locale);
  const products = await getCatalog();
  const piece = products[1] || products[0];
  return (
    <>
      <section className="container section about-page">
        <div className="about-image">
          {piece && (
            <Image
              src={piece.image}
              alt={piece.name[locale]}
              fill
              loading="eager"
              sizes="(max-width: 760px) 90vw, 45vw"
            />
          )}
        </div>
        <div className="about-copy">
          <span className="eyebrow">
            TAVAN TANSAG / {locale === "mn" ? "БИДНИЙ ТУХАЙ" : "OUR STORY"}
          </span>
          <h1>{c.footerLine}</h1>
          <p>{c.aboutText}</p>
          <p>
            {locale === "mn"
              ? "Манай Facebook хуудасны танилцуулгад үйл ажиллагаагаа 2010 оноос эхлүүлсэн тухай дурдсан. Энэхүү вебсайт нь эдлэлүүдтэй дэлгэрэнгүй танилцах, хийцийн онцлогийг ажиглах, сонголтынхоо талаар зөвлөгөө авах шинэ орон зай болж байна."
              : "Our Facebook introduction describes the business as operating since 2010. This website offers a new place to explore the pieces, look closely at their workmanship, and start a conversation about your choice."}
          </p>
          <p>
            {locale === "mn"
              ? "Бид эдлэлийн бодит зураг, ойлгомжтой тайлбар, нягталсан мэдээлэлд тулгуурлан танилцуулахыг эрхэмлэнэ. Үнэ, материал, хэмжээ болон бэлэн байдлыг зөвлөхтэй тодруулж, өөрийн хэрэгцээнд тохирох сонголт хийгээрэй."
              : "We aim to present the collection through original photographs, clear descriptions and carefully checked information. Our team can help you confirm the price, materials, dimensions and availability before choosing a piece for your needs."}
          </p>
          <h2>{locale === "mn" ? "Бэлгэдэл ба өв" : "Our symbol, our heritage"}</h2>
          <p>
            {locale === "mn"
              ? "Манай логоны хоорондоо сүлжилдсэн таван дөрвөлжин нь Монголын таван хошуу малыг бэлгэдэнэ. Тэдгээрийн тасралтгүй холбоос нь өв соёл, үнэ цэнэ үеэс үед үргэлжлэх утгыг илэрхийлдэг."
              : "The five interwoven squares in our logo symbolize Mongolia’s five traditional livestock: horses, camels, cattle, sheep and goats. Their continuous connection expresses heritage and value passed from one generation to the next."}
          </p>
          <p>
            {locale === "mn"
              ? "Дулаан хүрэл өнгө, даруу дүрслэл нь цаг хугацаанд үнэ цэнээ хадгалах өвийн тухай бидний үзэл санааг илэрхийлнэ."
              : "Warm Heritage Bronze and a restrained visual style reflect our belief in the enduring value of that heritage."}
          </p>
          <Link href={`/${locale}/collection`} className="text-link">
            {locale === "mn"
              ? "Эдлэлүүдтэй танилцах"
              : "Explore the collection"}
            <Arrow />
          </Link>
          <p className="article-meta">
            <a href={facebookUrl} target="_blank" rel="noreferrer">
              {locale === "mn"
                ? "Манай Facebook хуудас ба танилцуулга"
                : "Visit our Facebook page and introduction"}{" "}
              ↗
            </a>
          </p>
        </div>
      </section>
      <section className="container section service-guide" aria-labelledby="service-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{locale === "mn" ? "ТАНЫ СОНГОЛТЫН ДАРААГИЙН АЛХАМ" : "A CONVERSATION ABOUT YOUR CHOICE"}</span>
            <h2 id="service-title">{locale === "mn" ? "Эдлэлтэй танилцахаас эхэлье." : "Begin with a piece that speaks to you."}</h2>
          </div>
        </div>
        <ol className="service-steps">
          <li>
            <span className="service-step-number">01</span>
            <h3>{locale === "mn" ? "Сонирхсон эдлэлээ сонгох" : "Explore the collection"}</h3>
            <p>{locale === "mn" ? "Зураг, тайлбарыг үзэж, эдлэлийн кодыг тэмдэглээрэй. Өөртөө хэрэглэх, бэлэглэх эсвэл цуглуулах зорилгоо бодож болно." : "Look through the photographs and notes, and keep the piece reference. Consider whether it is for personal use, a gift or a collection."}</p>
          </li>
          <li>
            <span className="service-step-number">02</span>
            <h3>{locale === "mn" ? "Асуултаа хуваалцах" : "Tell us what matters"}</h3>
            <p>{locale === "mn" ? "Хэмжээ, материал, үнэ, нэмэлт зураг болон хэрэгтэй хугацаагаа асуугаарай. Монгол эсвэл Англи хэлээр холбогдож болно." : "Ask about dimensions, materials, price, further photographs and the date you have in mind. You can contact us in Mongolian or English."}</p>
          </li>
          <li>
            <span className="service-step-number">03</span>
            <h3>{locale === "mn" ? "Нөхцөлөө баталгаажуулах" : "Agree the details"}</h3>
            <p>{locale === "mn" ? "Бэлэн байдал, үнэ, хүлээн авах боломжийг тодруулсны дараа дараагийн алхмыг тохиролцоно. Хүсэлт илгээх нь захиалга баталгаажуулсан хэрэг биш." : "Once availability, price and handover options are clear, agree the next step with the team. Sending an enquiry does not confirm a reservation."}</p>
          </li>
        </ol>
        <div className="service-questions">
          <h3>{locale === "mn" ? "Зөвлөгөө авахаасаа өмнө" : "Before you get in touch"}</h3>
          <details>
            <summary>{locale === "mn" ? "Бэлэг сонгоход юу хэлэх вэ?" : "What should I mention when choosing a gift?"}</summary>
            <p>{locale === "mn" ? "Хүлээн авах хүний сонирхол, бэлэглэх үйл явдал, хэрэгтэй огноо, төсвийн хүрээгээ хүсвэл бичээрэй. Савлагаа болон нэмэлт үйлчилгээний боломжийг тухайн эдлэлээр нь тодруулна." : "You may share the recipient’s interests, occasion, required date and budget range. Packaging and any additional services are confirmed for the specific piece."}</p>
          </details>
          <details>
            <summary>{locale === "mn" ? "Гадаадаас сонирхож байвал яах вэ?" : "Can I enquire from another country?"}</summary>
            <p>{locale === "mn" ? "Улс, хот, сонирхсон эдлэлийн кодоо хүсэлтэд дурдана уу. Хүргэлт хийх боломж, хугацаа, зардал болон шаардлагатай нөхцөлийг тусад нь нягталсны дараа мэдээлнэ." : "Include your country, city and the piece reference in your enquiry. Delivery availability, timing, costs and any applicable requirements need to be checked separately before an arrangement is confirmed."}</p>
          </details>
          <details>
            <summary>{locale === "mn" ? "Эдлэлийг биеэр үзэж болох уу?" : "May I arrange to see a piece?"}</summary>
            <p>{locale === "mn" ? "Сонирхсон эдлэл, боломжтой өдөр цагаа бичиж хүсэлт илгээгээрэй. Үзүүлэх боломж, уулзах газар, цагийг ажилтан тантай эргэн холбогдож баталгаажуулна." : "Send the piece reference and your preferred day and time. A member of the team will need to confirm whether a viewing is available, together with the location and time."}</p>
          </details>
        </div>
        <Link href={`/${locale}/inquiry`} className="button button-dark">{locale === "mn" ? "Зөвлөгөө авах" : "Make an enquiry"}<Arrow /></Link>
      </section>
      <Consultation locale={locale} />
    </>
  );
}
