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
import { ContactDetails } from "./contact-details";
import { EngagementTrigger } from "./engagement-provider";

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
      <div className="container footer-invitation">
        <div>
          <span className="eyebrow">TAVAN TANSAG COMMUNITY</span>
          <h2>{locale === "mn" ? "Өв соёлоор холбогдох хүрээлэл." : "Connected by heritage."}</h2>
          <p>{locale === "mn" ? "Шинэ эдлэл, өв соёлын түүх, онцлох үйл явдлын тухай мэдээлэл авах хүсэлтээ үлдээгээрэй." : "Request updates on new pieces, heritage stories and events."}</p>
        </div>
        <EngagementTrigger kind="community" className="button">{locale === "mn" ? "Хүрээлэлд нэгдэх" : "Join our community"}<Arrow /></EngagementTrigger>
      </div>
      <div className="container footer-main">
        <div>
          <Link href={"/" + locale} className="footer-brand">
            <BrandLogo locale={locale} />
          </Link>
          <p>{c.footerLine}</p>
          <ContactDetails locale={locale} compact />
        </div>
        <div className="footer-links">
          <span className="footer-group-title">{locale === "mn" ? "ТАНИЛЦАХ" : "EXPLORE"}</span>
          <Link href={"/" + locale + "/collection"}>{c.collection}</Link>
          <Link href={"/" + locale + "/heritage"}>{c.heritage}</Link>
          <Link href={"/" + locale + "#films"}>{locale === "mn" ? "Богино бичлэг" : "Short films"}</Link>
          <Link href={"/" + locale + "/about"}>{c.about}</Link>
          <Link href={"/" + locale + "/services"}>{locale === "mn" ? "Үйлчилгээ" : "Services"}</Link>
        </div>
        <div className="footer-links">
          <span className="footer-group-title">{locale === "mn" ? "БИДЭНТЭЙ ХОЛБОГДОХ" : "KEEP IN TOUCH"}</span>
          <a href={facebookUrl} target="_blank" rel="noreferrer">
            Facebook <Arrow diagonal />
          </a>
          <EngagementTrigger kind="contact">{c.contact}<Arrow diagonal /></EngagementTrigger>
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
