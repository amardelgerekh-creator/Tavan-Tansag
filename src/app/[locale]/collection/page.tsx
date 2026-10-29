import { notFound } from "next/navigation";
import { isLocale } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog-store";
import { t } from "@/lib/copy";
import { Catalog } from "@/components/catalog";
import { Consultation } from "@/components/site";
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
      <section className="container catalog-page">
        <div className="page-heading">
          <span className="eyebrow">
            TAVAN TANSAG / {locale === "mn" ? "СОНГОЛТ" : "THE COLLECTION"}
          </span>
          <h1>{c.collection}</h1>
          <p>{c.collectionIntro}</p>
        </div>
        <Catalog products={products} locale={locale} />
      </section>
      <Consultation locale={locale} />
    </>
  );
}
