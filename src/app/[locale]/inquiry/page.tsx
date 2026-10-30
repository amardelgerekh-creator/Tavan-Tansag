import { notFound } from "next/navigation";
import { facebookUrl, isLocale } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog-store";
import { inquiryStorageConfigured } from "@/lib/server/inquiry-service";
import { t } from "@/lib/copy";
import { InquiryForm } from "@/components/inquiry-form";
import { Arrow } from "@/components/icons";
import { ContactDetails } from "@/components/contact-details";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Enquire" : "Зөвлөгөө авах",
    robots: { index: false, follow: false },
  };
}
export default async function Inquiry({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ piece?: string; purpose?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const products = await getCatalog();
  const c = t(locale);
  const { piece, purpose } = await searchParams;
  const enabled = inquiryStorageConfigured();
  return (
    <section className="container inquiry-page">
      <div className="inquiry-intro">
        <span className="eyebrow">
          {locale === "mn" ? "ТАНТАЙ ЯРИЛЦЪЯ" : "LET’S CONNECT"}
        </span>
        <h1>{c.formTitle}</h1>
        <p>{c.formText}</p>
        <div className="contact-detail">
          <ContactDetails locale={locale} />
          <a
            className="text-link"
            href={facebookUrl}
            target="_blank"
            rel="noreferrer"
          >
            Facebook
            <Arrow diagonal />
          </a>
        </div>
      </div>
      <InquiryForm
        locale={locale}
        products={products}
        selectedId={piece}
        purpose={purpose}
        enabled={enabled}
      />
    </section>
  );
}
