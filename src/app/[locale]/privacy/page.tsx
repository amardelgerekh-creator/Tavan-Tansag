import { notFound } from "next/navigation";
import { facebookUrl, isLocale } from "@/lib/catalog";
import { inquiryStorageConfigured } from "@/lib/server/inquiry-service";
import { businessDetails } from "@/lib/business";

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
            ? "Зөвлөгөө хүсэх болон Таван Тансагийн хүрээлэлд сайн дураар нэгдэхдээ хуваалцах мэдээллийн тухай."
            : "About the information you share when making an enquiry or voluntarily joining the Tavan Tansag community."}
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
                ? "Энэ хуудсанд зөвлөгөөний хүсэлт болон хүрээллийн бүртгэлийн мэдээллийг хэрхэн ашиглахыг тайлбарлав."
                : "Та вебсайтын ажлын хувилбарыг үзэж байна. Одоогоор цахим хүсэлтийн маягтаар мэдээлэл хүлээн авах боломж нээгдээгүй бөгөөд маягт дахь мэдээллийг илгээхгүй. Зөвлөгөө авах бол манай Facebook хуудсаар холбогдоно уу."
              : enabled
                ? "This page describes how enquiry and community request information is used."
                : "You are viewing a working version of the website. Online enquiries are not open, and the form does not submit your details. Please contact our Facebook page if you would like assistance."}
          </p>
        </section>
        <section>
          <h2>{locale === "mn" ? "Хүрээлэлд сайн дураар нэгдэх" : "Joining the community is optional"}</h2>
          <p>{locale === "mn"
            ? "Шинэ эдлэл, өв соёлын нийтлэл, үйл явдлын мэдээлэл авахыг хүсвэл хүрээллийн тусдаа маягтаар зөвшөөрлөө өгч болно. Энэ нь зөвлөгөө авах, эдлэл сонирхохын заавал биелүүлэх нөхцөл биш. Зөвлөгөөний хүсэлт илгээх нь хүрээлэлд автоматаар бүртгэхгүй."
            : "You may choose to give separate consent through the community form for updates about collections, heritage stories and events. Joining is not required to make an enquiry or view pieces. Sending an enquiry does not automatically create a community request."}</p>
          <p>{locale === "mn"
            ? "Маягт нь таны нэр, и-мэйл хаяг, хэрэв оруулсан бол овог, сонгосон сонирхлын ангилал, хэл, зөвшөөрөл өгсөн хугацаа болон зөвшөөрлийн тайлбарын хувилбарыг бүртгэнэ. Сонирхлын сонголтыг танд хамаарах мэдээллийг тодорхойлоход ашиглана. Эрх бүхий ажилтан хүсэлтийг шалгах, харилцаа болон цуцлалтын төлөвийг хөтлөхөд эдгээр мэдээллийг ашиглана. Мэдээллийг Firebase-д хадгалж, нийтэд харуулахгүй."
            : "The form records your first name, email address, optional last name, selected interests, language, consent timestamp and consent wording version. Your interests help identify relevant updates. Authorized staff use these details to review your request and manage contact and withdrawal status. The information is stored in Firebase and is not displayed publicly."}</p>
          <p>{locale === "mn"
            ? "Маягт илгээсэн нь тухайн и-мэйл хаягийн эзэмшигчийг баталгаажуулахгүй. Энэ хувилбар хүсэлтийг бүртгэх бөгөөд автоматаар сурталчилгааны и-мэйл илгээхгүй."
            : "Submitting the form does not verify ownership of the email address. This version records your request and does not automatically send marketing emails."}</p>
        </section>
        <section>
          <h2>
            {locale === "mn"
              ? "Хүсэлтэд ямар мэдээлэл хэрэгтэй вэ?"
              : "What information does an enquiry use?"}
          </h2>
          <p>
            {locale === "mn"
              ? "Цахим хүсэлт хүлээн авах үед таны нэр, сонгосон холбоо барих хэлбэр, и-мэйл хаяг эсвэл утасны дугаар, хүсэлтийн төрөл, асуултын агуулга, сонирхсон эдлэлийн код болон харилцах хэлийг бүртгэнэ. Эдгээрийг таны асуултад хариу өгөх, шаардлагатай мэдээллийг тодруулах, хүсэлтийн явцыг хөтлөхөд ашиглана."
              : "When online enquiries are available, they collect your name, preferred contact method, email address or phone number, enquiry purpose, message, selected piece reference and language. These details are used to answer your question, clarify the information you need and keep track of the enquiry."}
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
              ? enabled
                ? "Илгээсэн хүсэлтийг Firebase өгөгдлийн санд хадгалж, зөвхөн эрх бүхий ажилтан хүсэлтэд хариу өгөх, харилцааны явцыг хөтлөхөд ашиглана. Хүсэлтийн мэдээлэл нийтэд харагдах каталогт орохгүй."
                : "Цахим хүсэлт идэвхжихэд илгээсэн мэдээллийг Firebase өгөгдлийн санд хадгалж, зөвхөн эрх бүхий ажилтан хүсэлтэд хариу өгөхөд ашиглана."
              : enabled
                ? "Submitted enquiries are stored in Firebase and used by authorized staff to respond and manage the conversation. Enquiry details are not part of the public catalog."
                : "When online enquiries are enabled, submitted details will be stored in Firebase for authorized staff to respond to your request."}
          </p>
          <p>
            {locale === "mn"
              ? "Зөвлөгөө хүссэн мэдээллийг сурталчилгааны бүртгэлд автоматаар нэмэхгүй. Энэ хувилбарт сурталчилгааны хяналт, хэрэглэгчийн зан төлөв шинжлэх нэмэлт хэрэгсэл суулгаагүй."
              : "Making an enquiry does not automatically subscribe you to marketing. This version has no added advertising tracking or behavioural analytics tools."}
          </p>
          <p>{locale === "mn"
            ? "Ажилтны тайланд эдлэл, хэл, төлөвөөр нэгтгэсэн хүсэлтийн тоо болон ажилтан борлуулсан гэж тэмдэглэсэн үр дүнг харуулна. Тайлангийн тоон мэдээлэлд харилцагчийн нэр, холбоо барих мэдээлэл, зурвас орохгүй."
            : "Staff reports show enquiry counts grouped by piece, language and status, including outcomes marked as sales by staff. These aggregate reports do not include customer names, contact details or messages."}</p>
          <p>
            {locale === "mn"
              ? "Вебсайт ажиллахад шаардлагатай техникийн бүртгэлийг үйлчилгээ үзүүлэгчид боловсруулж болно. Манай Facebook холбоосоор орвол тухайн үйлчилгээний мэдээлэл ашиглах нөхцөл үйлчилнэ."
              : "Service providers may process technical records necessary to operate the website. If you follow our Facebook link, that service’s own data practices apply."}
          </p>
        </section>
        <section>
          <h2>
            {locale === "mn"
              ? "Мэдээллээ засуулах, зөвшөөрлөө цуцлах"
              : "Corrections and withdrawing consent"}
          </h2>
          <p>
            {locale === "mn"
              ? `Хуваалцсан мэдээллээ тодруулах, засуулах, сонирхлын сонголтоо өөрчлөх, устгах хүсэлт гаргах эсвэл хүрээллийн мэдээлэл авах зөвшөөрлөө цуцлах бол ${businessDetails.email} хаягаар эсвэл дэлгүүрийн ажилтанд мэдэгдэнэ үү. Бүртгүүлсэн и-мэйл хаягаа, зөвлөгөөний хүсэлтийн дугаар байгаа бол хамт дурдана уу.`
              : `To ask about your information, request a correction or deletion, change your interests or withdraw consent for community updates, contact ${businessDetails.email} or speak to store staff. Include the email address you used and an enquiry reference if you have one.`}
          </p>
          <p>{locale === "mn"
            ? "Ажилтан цуцлалтыг бүртгэсний дараа тухайн хүсэлтийг мэдээлэл илгээхэд ашиглахгүй. Зөвшөөрөл цуцлах нь бүртгэлийг автоматаар устгахгүй; мэдээлэл устгах хүсэлтийг тусад нь гаргаж болно. Энэ хувилбарт автоматаар устгах тогтсон хугацаа тохируулаагүй."
            : "Once staff record your withdrawal, the request will no longer be used for updates. Withdrawal does not automatically delete the record; you may separately request deletion. This version has no automatic deletion schedule."}</p>
          <p><a className="text-link" href={`mailto:${businessDetails.email}`}>{businessDetails.email} ↗</a></p>
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
            ? "Энэхүү мэдэгдэл нь Таван Тансагийн зөвлөгөөний болон хүрээллийн хүсэлтэд хамаарна. Шинэчлэгдсэн: 2026 оны 10 дугаар сарын 30."
            : "This notice applies to Tavan Tansag’s enquiry and community requests. Updated 30 October 2026."}
        </p>
      </div>
    </section>
  );
}
