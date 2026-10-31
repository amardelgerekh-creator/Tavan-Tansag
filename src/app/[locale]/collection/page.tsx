import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog-store";
import { t } from "@/lib/copy";
import { Catalog } from "@/components/catalog";
import { Consultation } from "@/components/site";
import { Arrow } from "@/components/icons";
import "@/app/collection-experience.css";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    title: locale === "en" ? "The collection" : "Эдлэлүүд",
    alternates: {
      canonical: "/" + locale + "/collection",
      languages: { mn: "/mn/collection", en: "/en/collection" },
    },
  };
}
export default async function Collection({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const products = await getCatalog();
  const c = t(locale);
  return (
    <>
      <section className="container catalog-page collection-experience" aria-labelledby="collection-title">
        <nav className="collection-breadcrumb" aria-label={locale === "mn" ? "Хуудасны байршил" : "Breadcrumb"}>
          <Link href={`/${locale}`}>{c.home}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{c.collection}</span>
        </nav>
        <header className="collection-heading">
          <div>
            <span className="eyebrow">{locale === "mn" ? "ТАВАН ТАНСАГИЙН ЦУГЛУУЛГА" : "THE TAVAN TANSAG COLLECTION"}</span>
            <h1 id="collection-title">{locale === "mn" ? "Таны сонирхлыг татах эдлэл." : "Find your next discovery."}</h1>
          </div>
          <div className="collection-heading-intro">
            <p>{locale === "mn" ? "Гоёл чимэглэлээс морины хэрэглэл хүртэл. Ангиллаар нь үзэж, хийцийн нарийн ширийнийг бодит зургаас нь сонирхоорой." : "From personal adornment to equestrian pieces. Browse by category and explore each detail through our own photography."}</p>
            <Link className="text-link" href={`/${locale}/inquiry`}>{locale === "mn" ? "Сонголт хийхэд тусламж авах" : "Let us help you choose"}<Arrow diagonal /></Link>
          </div>
        </header>
        <Catalog products={products} locale={locale} />
      </section>
      <Consultation locale={locale} />
    </>
  );
}
