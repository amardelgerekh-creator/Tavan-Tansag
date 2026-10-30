"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { facebookUrl, type Locale } from "@/lib/catalog";
import { ContactDetails } from "@/components/contact-details";
import { ContactIcon } from "@/components/contact-icon";
import { CommunityForm } from "@/components/community-form";
import "@/app/engagement.css";

type Kind = "contact" | "community";
type EngagementContextValue = { active: Kind | null; dialogId: string; open: (kind: Kind, trigger: HTMLButtonElement) => void };
const EngagementContext = createContext<EngagementContextValue | null>(null);

export function EngagementTrigger({ kind, children, className }: { kind: Kind; children: ReactNode; className?: string }) {
  const context = useContext(EngagementContext);
  if (!context) throw new Error("EngagementTrigger requires EngagementProvider.");
  return <button type="button" className={className} aria-haspopup="dialog" aria-controls={context.dialogId} aria-expanded={context.active === kind} onClick={(event) => context.open(kind, event.currentTarget)}>{children}</button>;
}

export function EngagementProvider({ children, locale }: { children: ReactNode; locale: Locale }) {
  const mn = locale === "mn";
  const pathname = usePathname();
  const dialogId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const backdropPressed = useRef(false);
  const previousPath = useRef(pathname);
  const [active, setActive] = useState<Kind | null>(null);
  const isOpen = active !== null;
  const close = useCallback(() => setActive(null), []);
  const open = useCallback((kind: Kind, button: HTMLButtonElement) => {
    trigger.current = button;
    setActive(kind);
  }, []);
  const context = useMemo(() => ({ active, dialogId, open }), [active, dialogId, open]);

  useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    if (!element) return;
    if (!element.open) element.showModal();
    const overflow = document.body.style.overflow;
    const paddingRight = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      if (element.open) element.close();
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => {
    if (previousPath.current !== pathname) close();
    previousPath.current = pathname;
  }, [pathname, close]);

  const outsideDialog = (x: number, y: number) => {
    const bounds = dialog.current?.getBoundingClientRect();
    return Boolean(bounds && (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom));
  };
  const title = active === "community" ? (mn ? "Таван Тансагийн хүрээлэлд нэгдэх" : "Join the Tavan Tansag community") : (mn ? "Бидэнтэй холбогдох" : "Contact us");
  const description = active === "community"
    ? (mn ? "Шинэ эдлэл, өв соёлын түүх, арга хэмжээний тухай мэдээлэл авах сонирхлоо хуваалцаж, нэгдэх хүсэлтээ үлдээгээрэй." : "Share your interests and request to hear about new collections, heritage stories and events.")
    : (mn ? "Эдлэл сонгох, уулзалт тохирох болон бусад асуултаар манай багтай холбогдоорой." : "Our team can help with questions about pieces, a visit to the store or your next enquiry.");

  return <EngagementContext.Provider value={context}>
    {children}
    <dialog
      id={dialogId}
      ref={dialog}
      className="engagement-drawer"
      aria-labelledby={`${dialogId}-title`}
      aria-describedby={`${dialogId}-description`}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClose={close}
      onPointerDown={(event) => { backdropPressed.current = event.target === event.currentTarget && outsideDialog(event.clientX, event.clientY); }}
      onClick={(event) => {
        if (backdropPressed.current && event.target === event.currentTarget && outsideDialog(event.clientX, event.clientY)) close();
        backdropPressed.current = false;
      }}
    >
      <div className="engagement-drawer-inner" ref={scrollArea}>
        <header className="engagement-drawer-top">
          <span className="engagement-brand">TAVAN TANSAG</span>
          <button type="button" ref={closeButton} className="engagement-close" aria-label={mn ? "Самбарыг хаах" : "Close panel"} onClick={close}><ContactIcon kind="close" /></button>
        </header>
        <div className="engagement-drawer-content">
          <div className="engagement-intro">
            <h2 id={`${dialogId}-title`}>{title}</h2>
            <p id={`${dialogId}-description`}>{description}</p>
          </div>
          <div hidden={active !== "contact"} className="engagement-contact">
            <ContactDetails locale={locale} />
            <div className="engagement-contact-actions">
              <Link href={`/${locale}/inquiry`} onClick={close}>
                <ContactIcon kind="message" />
                <span><strong>{mn ? "Зөвлөгөө хүсэх" : "Send an enquiry"}</strong><span>{mn ? "Сонирхсон эдлэлийнхээ талаар асуугаарай." : "Ask our team about a piece."}</span></span>
                <ContactIcon kind="arrow" />
              </Link>
              <Link href={`/${locale}/inquiry?purpose=visit`} onClick={close}>
                <ContactIcon kind="calendar" />
                <span><strong>{mn ? "Уулзах цаг хүсэх" : "Request a visit"}</strong><span>{mn ? "Ирэх өдөр, цагаа урьдчилан тохироорой." : "Arrange your preferred day and time."}</span></span>
                <ContactIcon kind="arrow" />
              </Link>
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
                <ContactIcon kind="message" />
                <span><strong>Facebook</strong><span>{mn ? "Таван Тансагийн Facebook хуудас" : "Visit the Tavan Tansag Facebook page"}</span></span>
                <ContactIcon kind="arrow" />
              </a>
            </div>
          </div>
          <div hidden={active !== "community"}><CommunityForm locale={locale} /></div>
        </div>
      </div>
    </dialog>
  </EngagementContext.Provider>;
}
