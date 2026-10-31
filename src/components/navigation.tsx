"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/catalog";
import { t } from "@/lib/copy";
import { Arrow } from "./icons";
import { BrandLogo } from "./brand-logo";
import { EngagementTrigger } from "./engagement-provider";

export function Navigation({ locale }: { locale: Locale }) {
  const c = t(locale);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 821px)");
    const resize = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    desktop.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
      desktop.removeEventListener("change", resize);
    };
  }, [open]);
  const switched = pathname.replace(
    /^\/(mn|en)(?=\/|$)/,
    locale === "mn" ? "/en" : "/mn",
  );
  const items = [
    ["collection", c.collection],
    ["heritage", c.heritage],
    ["services", locale === "mn" ? "Үйлчилгээ" : "Services"],
    ["about", c.about],
  ] as const;
  return (
    <header className="site-header" ref={header} onBlur={(event) => {
      if (open && !event.currentTarget.contains(event.relatedTarget) && !document.querySelector("dialog[open]")) setOpen(false);
    }}>
      <div className="nav-inner">
        <Link
          href={"/" + locale}
          className="wordmark"
          onClick={() => setOpen(false)}
        >
          <BrandLogo locale={locale} />
          <span className="brand-slogan">{c.footerLine}</span>
        </Link>
        <nav
          className="desktop-nav"
          aria-label={locale === "mn" ? "Үндсэн цэс" : "Main navigation"}
        >
          {items.map(([path, label]) => (
            <Link
              key={path}
              href={"/" + locale + "/" + path}
              aria-current={pathname.includes("/" + path) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <Link
            href={switched}
            onClick={(event) => {
              if (window.location.search) {
                event.preventDefault();
                window.location.assign(switched + window.location.search);
              }
            }}
            className="language"
            lang={locale === "mn" ? "en" : "mn"}
            aria-label={
              locale === "mn" ? "Switch to English" : "Монгол хэл рүү солих"
            }
          >
            {locale === "mn" ? "EN" : "МН"}
          </Link>
          <EngagementTrigger kind="contact" className="nav-contact">
            {locale === "mn" ? "Холбоо барих" : "Contact us"}
            <Arrow diagonal />
          </EngagementTrigger>
          <button
            ref={menuButton}
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? c.close : c.more}
            onClick={() => setOpen(!open)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" className="mobile-nav" aria-label={locale === "mn" ? "Гар утасны үндсэн цэс" : "Mobile navigation"}>
          {items.map(([path, label]) => (
            <Link
              key={path}
              href={"/" + locale + "/" + path}
              aria-current={pathname.includes("/" + path) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link href={"/" + locale + "/inquiry"} onClick={() => setOpen(false)}>
            {c.enquire}
          </Link>
          <EngagementTrigger kind="contact">{locale === "mn" ? "Холбоо барих" : "Contact us"}</EngagementTrigger>
          <EngagementTrigger kind="community">{locale === "mn" ? "Хүрээлэлд нэгдэх" : "Join our community"}</EngagementTrigger>
          <Link className="mobile-staff-link" href={`/${locale}/staff`} onClick={() => setOpen(false)}>{locale === "mn" ? "Ажилтны CRM" : "Staff CRM"}<Arrow diagonal /></Link>
        </nav>
      )}
    </header>
  );
}
