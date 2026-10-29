"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/catalog";
import { t } from "@/lib/copy";
import { Arrow } from "./icons";

export function Navigation({ locale }: { locale: Locale }) {
  const c = t(locale);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const switched = pathname.replace(
    /^\/(mn|en)(?=\/|$)/,
    locale === "mn" ? "/en" : "/mn",
  );
  const items = [
    ["collection", c.collection],
    ["heritage", c.heritage],
    ["about", c.about],
  ] as const;
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link
          href={"/" + locale}
          className="wordmark"
          aria-label="Tavan Tansag"
          onClick={() => setOpen(false)}
        >
          <span className="logo-frame">
            <img src="/images/logo.jpg" alt="" width="44" height="44" />
          </span>
          <span>
            TAVAN TANSAG
            <small>
              {locale === "mn" ? "ҮНЭТ ЭДЛЭЛ" : "MONGOLIAN PRECIOUS OBJECTS"}
            </small>
          </span>
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
          <Link href={"/" + locale + "/inquiry"} className="nav-contact">
            {c.enquire}
            <Arrow diagonal />
          </Link>
          <button
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
        <nav id="mobile-nav" className="mobile-nav">
          {items.map(([path, label]) => (
            <Link
              key={path}
              href={"/" + locale + "/" + path}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link href={"/" + locale + "/inquiry"} onClick={() => setOpen(false)}>
            {c.enquire}
          </Link>
        </nav>
      )}
    </header>
  );
}
