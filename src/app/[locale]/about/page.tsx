import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { facebookUrl, isLocale } from "@/lib/catalog";
import { getLocalCatalog } from "@/lib/server/local-catalog";
import { Arrow } from "@/components/icons";
import { Consultation } from "@/components/site";
import { t } from "@/lib/copy";

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
  const products = getLocalCatalog();
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
      <Consultation locale={locale} />
    </>
  );
}
