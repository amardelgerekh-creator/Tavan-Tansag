"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/catalog";

export function ProductGallery({ image, name, reference, locale }: {
  image: string;
  name: string;
  reference: string;
  locale: Locale;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const photograph = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const mn = locale === "mn";
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      element?.close();
    };
  }, [open]);

  useEffect(() => {
    const element = photograph.current;
    if (!element) return;
    element.scrollLeft = zoomed ? (element.scrollWidth - element.clientWidth) / 2 : 0;
    element.scrollTop = zoomed ? (element.scrollHeight - element.clientHeight) / 2 : 0;
  }, [zoomed, open]);

  function close() {
    setOpen(false);
    setZoomed(false);
  }

  return (
    <div className="piece-gallery">
      <button
        className="piece-gallery-trigger"
        type="button"
        aria-label={mn ? `${name} — зургийг томруулж үзэх` : `${name} — enlarge photograph`}
        onClick={() => setOpen(true)}
      >
        <Image src={image} alt={name} fill loading="eager" fetchPriority="high"
          sizes="(max-width: 760px) 94vw, 55vw" />
        <span className="piece-gallery-reference">{reference} · 01</span>
        <span className="piece-gallery-enlarge">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
          </svg>
          {mn ? "Томруулж үзэх" : "Take a closer look"}
        </span>
      </button>
      <p className="piece-gallery-caption">
        <span>{mn ? "Эдлэлийн эх зураг" : "Original photograph"}</span>
        <span>1 / 1</span>
      </p>
      <dialog ref={dialog} className="piece-photo-dialog" aria-label={mn ? "Эдлэлийн томруулсан зураг" : "Enlarged product photograph"} onClose={close} onCancel={close}>
        <div className="piece-photo-toolbar">
          <span>{reference}</span>
          <button type="button" aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)}>
            {zoomed ? (mn ? "Бүтнээр харах" : "Fit photograph") : (mn ? "Дэлгэрүүлж харах +" : "Zoom in +")}
          </button>
          <button type="button" onClick={close} autoFocus>{mn ? "Хаах ×" : "Close ×"}</button>
        </div>
        {open && <div className="piece-photo-scroll" ref={photograph}>
          <div className={`piece-photo-canvas${zoomed ? " is-zoomed" : ""}`}>
            <Image src={image} alt={name} fill sizes={zoomed ? "200vw" : "100vw"} />
          </div>
        </div>}
        <p className="piece-photo-name">{name}</p>
      </dialog>
    </div>
  );
}
