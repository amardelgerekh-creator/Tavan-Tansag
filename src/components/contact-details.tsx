import type { Locale } from "@/lib/catalog";
import { businessDetails } from "@/lib/business";
import { ContactIcon } from "./contact-icon";
import "@/app/contact-details.css";

export function ContactDetails({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const mn = locale === "mn";
  return <address className={`contact-details${compact ? " contact-details-compact" : ""}`} aria-label={mn ? "Таван Тансагийн холбоо барих мэдээлэл" : "Tavan Tansag contact details"}>
    <ul>
      <li><div className="contact-row"><ContactIcon kind="location"/><span className="contact-row-copy"><span className="contact-label">{mn ? "Манай дэлгүүр" : "Visit our store"}</span><span className="contact-value">{businessDetails.address[locale]}</span></span></div></li>
      <li><a className="contact-row contact-action" href={`tel:${businessDetails.phone}`}><ContactIcon kind="phone"/><span className="contact-row-copy"><span className="contact-label">{mn ? "Утсаар холбогдох" : "Call us"}</span><span className="contact-value">{businessDetails.phoneDisplay}</span></span><ContactIcon kind="arrow"/></a></li>
      <li><a className="contact-row contact-action" href={`mailto:${businessDetails.email}`}><ContactIcon kind="email"/><span className="contact-row-copy"><span className="contact-label">{mn ? "И-мэйл бичих" : "Email us"}</span><span className="contact-value">{businessDetails.email}</span></span><ContactIcon kind="arrow"/></a></li>
      <li><div className="contact-row"><ContactIcon kind="clock"/><span className="contact-row-copy"><span className="contact-label">{mn ? "Ажиллах цаг" : "Opening hours"}</span><span className="contact-value contact-hours">{businessDetails.hours}<span>{mn ? "Улаанбаатарын цагаар" : "Ulaanbaatar time"}</span></span><span className="contact-note">{mn ? "Ирэх өдрөө урьдчилан лавлана уу." : "Please confirm your visiting day."}</span></span></div></li>
    </ul>
  </address>;
}
