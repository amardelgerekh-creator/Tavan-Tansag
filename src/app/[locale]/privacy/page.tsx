import { notFound } from "next/navigation";
import { facebookUrl, isLocale } from "@/lib/catalog";
import { inquiryStorageConfigured } from "@/lib/server/inquiry-service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Privacy" : "Мэдээллийн нууцлал",
    robots: { index: false, follow: false },
  };
}

export default async function Privacy({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const enabled = inquiryStorageConfigured();
  return (
    <section className="container section">
      <div className="page-heading article-heading">
        <span className="eyebrow">TAVAN TANSAG</span>
        <h1>{locale === "mn" ? "Мэдээллийн нууцлал" : "Your information"}</h1>
        <p>
          {locale === "mn"
            ? "Зөвлөгөө авах үедээ хуваалцах мэдээллийн тухай."
            : "About the information you share when making an enquiry."}
        </p>
      </div>
      <div className="article-body">
        <section>
          <h2>
            {locale === "mn" ? "Энэ хувилбарын тухай" : "About this version"}
          </h2>
          <p>
            {locale === "mn"
              ? enabled
                ? "Энэ хуудсанд хүсэлтэд хариулахад ашиглах мэдээллийн хүрээг тайлбарлав."
                : "Та вебсайтын ажлын хувилбарыг үзэж байна. Одоогоор цахим хүсэлтийн маягтаар мэдээлэл хүлээн авах боломж нээгдээгүй бөгөөд маягт дахь мэдээллийг илгээхгүй. Зөвлөгөө авах бол манай Facebook хуудсаар холбогдоно уу."
              : enabled
                ? "This page describes the information used to respond to an enquiry."
                : "You are viewing a working version of the website. Online enquiries are not open, and the form does not submit your details. Please contact our Facebook page if you would like assistance."}
          </p>
        </section>
        <section>
          <h2>
            {locale === "mn"
              ? "Хүсэлтэд ямар мэдээлэл хэрэгтэй вэ?"
              : "What information does an enquiry use?"}
          </h2>
          <p>
            {locale === "mn"
              ? "Цахим хүсэлт хүлээн авах үед таны нэр, сонгосон холбоо барих хэлбэр, и-мэйл хаяг эсвэл утасны дугаар, асуултын агуулга, сонирхсон эдлэлийн код болон харилцах хэлийг бүртгэнэ. Эдгээрийг таны асуултад хариу өгөх, шаардлагатай мэдээллийг тодруулах, хүсэлтийн явцыг хөтлөхөд ашиглана."
              : "When online enquiries are available, they collect your name, preferred contact method, email address or phone number, message, selected piece reference and language. These details are used to answer your question, clarify the information you need and keep track of the enquiry."}
          </p>
          <p>
            {locale === "mn"
              ? "Банкны картын мэдээлэл, иргэний үнэмлэхийн зураг болон хүсэлтэд хамааралгүй хувийн мэдээлэл оруулах шаардлагагүй."
              : "You do not need to provide payment card details, an identity document or personal information unrelated to the enquiry."}
          </p>
        </section>
        <section>
          <h2>{locale === "mn" ? "Хандалт ба ашиглалт" : "Access and use"}</h2>
          <p>
            {locale === "mn"
              ? "Хүсэлтийн мэдээллийг хариу өгөх эрх бүхий ажилтан ашиглахаар төлөвлөсөн. Зөвлөгөө хүссэн мэдээллийг сурталчилгааны бүртгэлд автоматаар нэмэхгүй. Энэ хувилбарт сурталчилгааны хяналт, хэрэглэгчийн зан төлөв шинжлэх нэмэлт хэрэгсэл суулгаагүй."
              : "Enquiry information is intended for authorized staff responding to your request. Making an enquiry does not automatically subscribe you to marketing. This version has no added advertising tracking or behavioural analytics tools."}
          </p>
          <p>
            {locale === "mn"
              ? "Вебсайт ажиллахад шаардлагатай техникийн бүртгэлийг үйлчилгээ үзүүлэгчид боловсруулж болно. Манай Facebook холбоосоор орвол тухайн үйлчилгээний мэдээлэл ашиглах нөхцөл үйлчилнэ."
              : "Service providers may process technical records necessary to operate the website. If you follow our Facebook link, that service’s own data practices apply."}
          </p>
        </section>
        <section>
          <h2>
            {locale === "mn"
              ? "Мэдээллээ тодруулах, засуулах"
              : "Questions or corrections"}
          </h2>
          <p>
            {locale === "mn"
              ? "Хуваалцсан мэдээллийнхээ талаар асуух, засвар хүсэх эсвэл устгах хүсэлт гаргах бол манай албан ёсны Facebook хуудсаар холбогдоно уу. Хүсэлтийн дугаар байгаа бол хамт дурдана уу."
              : "To ask about information you have shared, request a correction or ask for deletion, contact our official Facebook page. Include an enquiry reference if you have one."}
          </p>
          <p>
            <a
              className="text-link"
              href={facebookUrl}
              target="_blank"
              rel="noreferrer"
            >
              {locale === "mn"
                ? "Facebook-ээр холбогдох"
                : "Contact us on Facebook"}{" "}
              ↗
            </a>
          </p>
        </section>
        <p className="article-meta">
          {locale === "mn"
            ? "Ажлын хувилбарын мэдэгдэл. Үйлчилгээг нийтэд нээхээс өмнө мэдээлэл хариуцах байгууллага, хадгалах хугацаа болон хүсэлт шийдвэрлэх нөхцөлийг бүрэн баталгаажуулж нийтэлнэ."
            : "Working-version notice. The responsible business, retention period and request-handling arrangements must be finalized and published before the service opens to the public."}
        </p>
      </div>
    </section>
  );
}
