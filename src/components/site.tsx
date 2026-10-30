import Link from "next/link";
import Image from "next/image";
import {
  categories,
  subcategories,
  facebookUrl,
  type Locale,
  type Product,
} from "@/lib/catalog";
import { t } from "@/lib/copy";
import { Arrow } from "./icons";
import { BrandLogo } from "./brand-logo";
import { productPrice } from "@/lib/product-presentation";
import { businessDetails } from "@/lib/business";

export function ProductCard({
  product: p,
  locale,
  priority = false,
}: {
  product: Product;
  locale: Locale;
  priority?: boolean;
}) {
  const c = t(locale);
  return (
    <article className="product-card">
      <Link
        href={"/" + locale + "/products/" + p.slug}
        className="product-image-link"
        aria-label={p.name[locale]}
      >
        <Image
          src={p.image}
          alt={p.name[locale]}
          fill
          sizes="(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 30vw"
          loading={priority ? "eager" : "lazy"}
          className="product-image"
        />
        <span className="product-reference">{p.id}</span>
        <span className="image-arrow">
          <Arrow diagonal />
        </span>
      </Link>
      <div className="product-meta">
        <span>{(p.subcategory && subcategories[p.category]?.[p.subcategory]?.[locale]) || categories[p.category]?.[locale] || c.collection}</span>
        <span>{productPrice(p, locale)}</span>
      </div>
      <h3>
        <Link href={"/" + locale + "/products/" + p.slug}>
          {p.name[locale]}
        </Link>
      </h3>
    </article>
  );
}
export function Consultation({ locale }: { locale: Locale }) {
  const c = t(locale);
  return (
    <section className="consultation">
      <div className="container consultation-inner">
        <span className="eyebrow gold">
          {locale === "mn" ? "ХУВИЙН ЗӨВЛӨГӨӨ" : "A PERSONAL CONVERSATION"}
        </span>
        <h2>{c.ctaTitle}</h2>
        <p>{c.ctaText}</p>
        <Link href={"/" + locale + "/inquiry"} className="button button-light">
          {c.enquire}
          <Arrow diagonal />
        </Link>
      </div>
      <span className="consultation-line" aria-hidden="true" />
    </section>
  );
}
export function Footer({ locale }: { locale: Locale }) {
  const c = t(locale);
  return (
    <footer className="footer">
      <div className="container footer-main">
        <div>
          <Link href={"/" + locale} className="footer-brand">
            <BrandLogo locale={locale} />
          </Link>
          <p>{c.footerLine}</p>
          <address className="footer-business">{businessDetails.address[locale]}<br />
            <a href={`tel:${businessDetails.phone}`}>{businessDetails.phoneDisplay}</a><br />
            <a href={`mailto:${businessDetails.email}`}>{businessDetails.email}</a><br />
            {businessDetails.hours} · {locale === "mn" ? "Ирэх өдрөө урьдчилан лавлана уу." : "Please confirm your visiting day."}
          </address>
        </div>
        <div className="footer-links">
          <Link href={"/" + locale + "/collection"}>{c.collection}</Link>
          <Link href={"/" + locale + "/heritage"}>{c.heritage}</Link>
          <Link href={"/" + locale + "/about"}>{c.about}</Link>
          <Link href={"/" + locale + "/services"}>{locale === "mn" ? "Үйлчилгээ" : "Services"}</Link>
        </div>
        <div className="footer-links">
          <a href={facebookUrl} target="_blank" rel="noreferrer">
            Facebook <Arrow diagonal />
          </a>
          <Link href={"/" + locale + "/inquiry"}>{c.contact}</Link>
          <Link href={"/" + locale + "/privacy"}>{c.privacy}</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Tavan Tansag</span>
        <Link href={"/" + locale + "/staff"}>{locale === "mn" ? "Ажилтны хэсэг" : "Staff sign-in"}</Link>
        <span>ULAANBAATAR, MONGOLIA</span>
      </div>
      <div className="sample-notice">{c.sample}</div>
    </footer>
  );
}
