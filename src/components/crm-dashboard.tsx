"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider, inMemoryPersistence, onAuthStateChanged, setPersistence, signInWithPopup, signOut, type Auth, type User } from "firebase/auth";
import type { Locale } from "@/lib/catalog";
import { crmStatuses, inquiryRecordSchema, type CrmPatch, type CrmStatus, type InquiryRecord } from "@/lib/crm-contract";
import "@/app/crm.css";
import { inquiryPurposeLabels } from "@/lib/inquiry-options";
import { CatalogReviewWorkspace } from "./catalog-review-workspace";
import { CrmMetrics } from "./crm-metrics";
import { CommunityWorkspace } from "./community-workspace";
import "@/app/crm-metrics.css";

const statusNames: Record<CrmStatus, Record<Locale, string>> = {
  new: { mn: "Шинэ хүсэлт", en: "New" },
  contacted: { mn: "Холбогдсон", en: "Contacted" },
  consultation: { mn: "Зөвлөгөө өгсөн", en: "Consultation" },
  quoted: { mn: "Үнийн санал өгсөн", en: "Quoted" },
  won: { mn: "Борлуулсан", en: "Won" },
  closed: { mn: "Хаасан", en: "Closed" },
};

function timeLabel(value: string, locale: Locale) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ulaanbaatar",
  }).format(date);
}

function localDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function firebaseError(error: unknown, locale: Locale) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request")
    return locale === "mn" ? "Нэвтрэх цонх хаагдсан. Дахин нэвтэрч болно." : "The sign-in window was closed. You can try again.";
  if (code === "auth/popup-blocked")
    return locale === "mn" ? "Браузер нэвтрэх цонхыг хаалаа. Энэ сайтын нэмэлт цонх нээхийг зөвшөөрөөд дахин оролдоно уу." : "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
  return locale === "mn" ? "Нэвтрэх боломжгүй байна. Түр хүлээгээд дахин оролдоно уу." : "Sign-in is unavailable. Please try again shortly.";
}

export function CrmDashboard({ locale, config }: { locale: Locale; config: FirebaseOptions }) {
  const auth = useRef<Auth | null>(null);
  const requestVersion = useRef(0);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [staffEmail, setStaffEmail] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState<CrmStatus | "">("");
  const [items, setItems] = useState<InquiryRecord[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<InquiryRecord | null>(null);
  const [workspace, setWorkspace] = useState<"inquiries" | "catalog" | "metrics" | "community">("inquiries");

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    async function initialize() {
      try {
        const app = getApps().find((candidate) => candidate.name === "tavan-tansag-staff") || initializeApp(config, "tavan-tansag-staff");
        const instance = getAuth(app);
        await setPersistence(instance, inMemoryPersistence);
        if (!active) return;
        auth.current = instance;
        unsubscribe = onAuthStateChanged(instance, (current) => {
          requestVersion.current += 1;
          setItems([]);
          setSelected(null);
          setStaffEmail("");
          setHasMore(false);
          setNextCursor(null);
          setUser(current);
          setWorkspace("inquiries");
          setReady(true);
        });
      } catch (cause) {
        if (active) setError(locale === "mn" ? "Нэвтрэлтийг бэлтгэж чадсангүй. Хуудсыг дахин ачаална уу." : "Sign-in could not be prepared. Please reload the page.");
      }
    }
    void initialize();
    return () => { active = false; requestVersion.current += 1; unsubscribe(); auth.current = null; };
  }, [config, locale]);

  const load = useCallback(async (cursor?: string) => {
    if (!user) return;
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (cursor) params.set("before", cursor);
      const response = await fetch(`/api/staff/inquiries?${params}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", credentials: "omit",
      });
      if (version !== requestVersion.current) return;
      if (response.status === 401 || response.status === 403) {
        setItems([]); setSelected(null); setStaffEmail(""); setHasMore(false); setNextCursor(null);
        setError(response.status === 403
          ? locale === "mn" ? "Энэ Google эрхэд ажилтны хэсэгт нэвтрэх зөвшөөрөл байхгүй. Гараад зөвшөөрөгдсөн эрхээр нэвтэрнэ үү." : "This Google account does not have staff access. Sign out and use an authorized account."
          : locale === "mn" ? "Нэвтрэх эрхийг баталгаажуулж чадсангүй. Гараад дахин нэвтэрнэ үү." : "Your session could not be verified. Please sign out and sign in again.");
        return;
      }
      if (!response.ok) throw new Error("REQUEST_FAILED");
      const body = await response.json();
      if (version !== requestVersion.current) return;
      const records = inquiryRecordSchema.array().safeParse(body.items);
      if (!records.success || typeof body.staff?.email !== "string") throw new Error("INVALID_RESPONSE");
      setItems((previous) => cursor ? [...previous, ...records.data.filter((entry) => !previous.some((old) => old.reference === entry.reference))] : records.data);
      setStaffEmail(body.staff.email);
      setHasMore(body.hasMore === true);
      setNextCursor(typeof body.nextCursor === "string" ? body.nextCursor : null);
      if (!cursor) setSelected(null);
    } catch {
      if (version === requestVersion.current) setError(locale === "mn" ? "Хүсэлтүүдийг уншиж чадсангүй. Дахин ачаална уу." : "We could not load the enquiries. Please refresh the list.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [user, status, locale]);

  useEffect(() => { void load(); }, [load]);

  async function login() {
    if (!auth.current) return;
    setLoginBusy(true); setError(""); setNotice("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth.current, provider);
    } catch (cause) { setError(firebaseError(cause, locale)); }
    finally { setLoginBusy(false); }
  }

  async function logout() {
    requestVersion.current += 1;
    setItems([]); setSelected(null); setStaffEmail(""); setNotice(""); setError(""); setLoading(false);
    try { if (auth.current) await signOut(auth.current); }
    catch { setError(locale === "mn" ? "Гарч чадсангүй. Энэ цонхыг хааж болно." : "Sign-out failed. You can close this tab."); }
  }

  return (
    <div className="crm-dashboard">
      <header className="crm-header">
        <div><span className="eyebrow">TAVAN TANSAG / {locale === "mn" ? "АЖИЛТНЫ ХЭСЭГ" : "STAFF AREA"}</span>
          <h1>{locale === "mn" ? "Дэлгүүрийн ажлын талбар" : "Store workspace"}</h1>
          <p>{locale === "mn" ? "Хүсэлт, эдлэлийн баталгаажуулалт, үр дүнгийн тайлан, хүрээллийн бүртгэл." : "Enquiries, catalog verification, results and community requests."}</p>
        </div>
        {user && <div className="crm-session"><span>{staffEmail || user.email}</span><button type="button" className="crm-secondary" onClick={() => void logout()}>{locale === "mn" ? "Гарах" : "Sign out"}</button></div>}
      </header>
      {error && <p className="crm-message crm-error" role="alert">{error}</p>}
      {notice && <p className="crm-message" role="status">{notice}</p>}
      {!user ? <section className="crm-login">
        <span className="crm-login-mark" aria-hidden="true">↗</span>
        <h2>{locale === "mn" ? "Ажилтны эрхээр нэвтрэх" : "Sign in to your workspace"}</h2>
        <p>{locale === "mn" ? "Зөвшөөрөгдсөн Google эрхээр нэвтэрч хүсэлтүүдийг хөтөлнө. Энэ цонхыг хаахад нэвтрэлт хадгалагдахгүй." : "Use an authorized Google account to manage enquiries. Your sign-in is not saved after this tab is closed."}</p>
        <button className="button button-dark" disabled={!ready || loginBusy} onClick={() => void login()}>{loginBusy ? locale === "mn" ? "Нэвтэрч байна…" : "Signing in…" : locale === "mn" ? "Google эрхээр нэвтрэх" : "Continue with Google"}</button>
        {!ready && error && <button type="button" className="crm-secondary" onClick={() => window.location.reload()}>{locale === "mn" ? "Хуудсыг дахин ачаалах" : "Reload page"}</button>}
      </section> : <>
        {staffEmail && <nav className="staff-workspace-nav" aria-label={locale === "mn" ? "Ажилтны цэс" : "Workspace sections"}>
          {(["inquiries", "catalog", "metrics", "community"] as const).map(value => <button key={value} type="button" aria-pressed={workspace === value} onClick={() => { setWorkspace(value); setNotice(""); }}>{({ inquiries: { mn: "Хүсэлтүүд", en: "Enquiries" }, catalog: { mn: "Эдлэлийн бүртгэл", en: "Catalog verification" }, metrics: { mn: "Үр дүн", en: "Results" }, community: { mn: "Хүрээллийн хүсэлт", en: "Community requests" } })[value][locale]}</button>)}
        </nav>}
        {workspace === "catalog" && staffEmail ? <CatalogReviewWorkspace locale={locale} user={user} /> : workspace === "metrics" && staffEmail ? <CrmMetrics locale={locale} user={user} /> : workspace === "community" && staffEmail ? <CommunityWorkspace key={user.uid} locale={locale} user={user} /> : <>
        <div className="crm-toolbar">
          <label>{locale === "mn" ? "Хүсэлтийн төлөв" : "Status"}<select value={status} onChange={(event) => { setSelected(null); setItems([]); setHasMore(false); setNextCursor(null); setNotice(""); setStatus(event.target.value as CrmStatus | ""); }}><option value="">{locale === "mn" ? "Бүх төлөв" : "All statuses"}</option>{crmStatuses.map((value) => <option key={value} value={value}>{statusNames[value][locale]}</option>)}</select></label>
          <span className="crm-result-count">{items.length} {locale === "mn" ? "хүсэлт ачаалсан" : "enquiries loaded"}</span>
          <button className="crm-secondary" disabled={loading} onClick={() => void load()}>{loading ? locale === "mn" ? "Уншиж байна…" : "Loading…" : locale === "mn" ? "Шинэчлэх" : "Refresh"}</button>
        </div>
        <div className="crm-workspace">
          <section className="crm-list" aria-label={locale === "mn" ? "Хүсэлтийн жагсаалт" : "Enquiry list"} aria-busy={loading}>
            {!items.length && !loading && !error && <div className="crm-empty"><h2>{locale === "mn" ? "Хүсэлт алга" : "No enquiries yet"}</h2><p>{locale === "mn" ? "Энэ төлөвт хүсэлт орж ирвэл энд харагдана." : "Enquiries in this status will appear here."}</p></div>}
            {!items.length && loading && <p className="crm-empty" role="status">{locale === "mn" ? "Хүсэлтүүдийг уншиж байна…" : "Loading enquiries…"}</p>}
            {items.map((item) => <button type="button" key={item.reference} className={`crm-list-item${selected?.reference === item.reference ? " is-selected" : ""}`} aria-pressed={selected?.reference === item.reference} aria-controls={selected?.reference === item.reference ? "crm-detail-panel" : undefined} onClick={() => { setSelected(item); setNotice(""); }}>
              <span className="crm-item-top"><strong>{item.name}</strong><span className={`crm-badge crm-status-${item.status}`}>{statusNames[item.status][locale]}</span></span>
              <span className="crm-item-piece">{item.productId ? `${item.productId} · ${item.productName?.[locale] || ""}` : locale === "mn" ? "Ерөнхий зөвлөгөө" : "General enquiry"}</span>
              <span className="crm-item-message">{item.message}</span>
              <span className="crm-item-bottom"><time dateTime={item.createdAt}>{timeLabel(item.createdAt, locale)}</time><span>{item.locale.toUpperCase()}</span></span>
              {item.followUpAt && <span className="crm-item-followup">{locale === "mn" ? "Дараагийн холбоо: " : "Follow-up: "}{timeLabel(item.followUpAt, locale)}</span>}
            </button>)}
            {hasMore && nextCursor && <button type="button" className="crm-secondary crm-load-more" disabled={loading} onClick={() => void load(nextCursor)}>{locale === "mn" ? "Өмнөх хүсэлтүүд" : "Load earlier enquiries"}</button>}
          </section>
          {selected && user ? <InquiryEditor key={`${selected.reference}-${selected.revision}`} item={selected} locale={locale} user={user} onSaved={(item) => {
            if (auth.current?.currentUser?.uid !== user.uid) return;
            setItems((previous) => previous.map((entry) => entry.reference === item.reference ? item : entry).filter((entry) => !status || entry.status === status));
            setSelected(!status || item.status === status ? item : null);
            setNotice(locale === "mn" ? "Өөрчлөлтийг хадгаллаа." : "Changes saved.");
          }} onConflict={() => { setNotice(locale === "mn" ? "Энэ хүсэлт өөрчлөгдсөн тул таны засварыг хадгалаагүй. Жагсаалтыг шинэчиллээ; хүсэлтээ дахин сонгож шинэ мэдээллийг шалгана уу." : "This enquiry changed, so your edits were not saved. The list has been refreshed; select the enquiry again to review the latest details."); void load(); }} onClose={() => setSelected(null)} /> : <aside className="crm-selection-placeholder"><span aria-hidden="true">↖</span><p>{locale === "mn" ? "Жагсаалтаас хүсэлт сонгож дэлгэрэнгүйг үзнэ үү." : "Select an enquiry to see the details."}</p></aside>}
        </div>
        <p className="crm-footnote">{locale === "mn" ? "Бүх цаг Улаанбаатарын цагаар. Мэдээлэл зөвхөн ажилтны хэрэгцээнд зориулагдсан." : "All times are in Ulaanbaatar time. Client information is for authorized staff use only."}</p>
        </>}
      </>}
    </div>
  );
}

function InquiryEditor({ item, locale, user, onSaved, onConflict, onClose }: {
  item: InquiryRecord; locale: Locale; user: User; onSaved: (item: InquiryRecord) => void; onConflict: () => void; onClose: () => void;
}) {
  const [status, setStatus] = useState(item.status);
  const [assignee, setAssignee] = useState(item.assignee);
  const [followUp, setFollowUp] = useState(localDateInput(item.followUpAt));
  const [notes, setNotes] = useState(item.notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    mounted.current = true;
    heading.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 950px)").matches) heading.current?.scrollIntoView({ behavior: "instant", block: "start" });
    return () => { mounted.current = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError("");
    try {
      const patch: CrmPatch = { revision: item.revision, status, assignee: assignee.trim(), followUpAt: followUp ? new Date(`${followUp}:00+08:00`).toISOString() : null, notes: notes.trim() };
      const token = await user.getIdToken();
      const response = await fetch(`/api/staff/inquiries/${encodeURIComponent(item.reference)}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(patch), cache: "no-store", credentials: "omit" });
      if (!mounted.current) return;
      if (response.status === 409) { onConflict(); return; }
      if (response.status === 401 || response.status === 403) { setError(locale === "mn" ? "Хадгалах эрхийг баталгаажуулж чадсангүй. Гараад дахин нэвтэрнэ үү." : "Your access could not be verified. Please sign out and sign in again."); return; }
      if (!response.ok) throw new Error("SAVE_FAILED");
      const body = await response.json();
      const parsed = inquiryRecordSchema.safeParse(body.item);
      if (!parsed.success) throw new Error("INVALID_RESPONSE");
      if (mounted.current) onSaved(parsed.data);
    } catch { if (mounted.current) setError(locale === "mn" ? "Хадгалсан эсэхийг баталгаажуулж чадсангүй. Дахин оролдохын өмнө жагсаалтыг шинэчилж шалгана уу." : "We could not confirm the save. Refresh the list before trying again."); }
    finally { if (mounted.current) setSaving(false); }
  }

  return <section className="crm-detail" id="crm-detail-panel" aria-labelledby="crm-detail-title">
    <div className="crm-detail-heading"><div><span className="crm-reference">{item.reference}</span><h2 id="crm-detail-title" tabIndex={-1} ref={heading}>{item.name}</h2></div><button type="button" className="crm-secondary" onClick={onClose}>{locale === "mn" ? "Хаах" : "Close"}</button></div>
    <dl className="crm-facts">
      <div><dt>{locale === "mn" ? "Холбоо барих" : "Contact"}</dt><dd><a href={item.contactMethod === "email" ? `mailto:${encodeURIComponent(item.contactValue)}` : `tel:${item.contactValue.replace(/[^+\d]/g, "")}`}>{item.contactValue}</a><button type="button" className="crm-copy" onClick={async () => { try { await navigator.clipboard.writeText(item.contactValue); if (mounted.current) setCopied(true); } catch { setError(locale === "mn" ? "Хуулж чадсангүй. Мэдээллийг сонгон хуулна уу." : "Copy failed. Select and copy the contact details."); } }}>{copied ? locale === "mn" ? "Хуулсан" : "Copied" : locale === "mn" ? "Хуулах" : "Copy"}</button></dd></div>
      <div><dt>{locale === "mn" ? "Сонирхсон эдлэл" : "Piece"}</dt><dd>{item.productId ? `${item.productId} · ${item.productName?.[locale] || ""}` : locale === "mn" ? "Ерөнхий зөвлөгөө" : "General enquiry"}</dd></div>
      <div><dt>{locale === "mn" ? "Харилцах хэл" : "Language"}</dt><dd>{item.locale === "mn" ? "Монгол" : "English"}</dd></div>
      <div><dt>{locale === "mn" ? "Хүсэлтийн төрөл" : "Enquiry purpose"}</dt><dd>{inquiryPurposeLabels[item.purpose ?? "general"][locale]}</dd></div>
      <div><dt>{locale === "mn" ? "Ирсэн" : "Received"}</dt><dd>{timeLabel(item.createdAt, locale)}</dd></div>
    </dl>
    <div className="crm-client-message"><span className="eyebrow">{locale === "mn" ? "ХАРИЛЦАГЧИЙН ЗУРВАС" : "CLIENT MESSAGE"}</span><p>{item.message}</p></div>
    <form onSubmit={save} className="crm-edit-form">
      <div className="crm-edit-row"><label>{locale === "mn" ? "Төлөв" : "Status"}<select value={status} onChange={(event) => setStatus(event.target.value as CrmStatus)}>{crmStatuses.map((value) => <option key={value} value={value}>{statusNames[value][locale]}</option>)}</select></label><label>{locale === "mn" ? "Хариуцсан ажилтан" : "Assigned to"}<input value={assignee} onChange={(event) => setAssignee(event.target.value)} required maxLength={160} autoComplete="off" /></label></div>
      <label>{locale === "mn" ? "Дараагийн холбоо барих хугацаа · Улаанбаатар" : "Next follow-up · Ulaanbaatar time"}<input type="datetime-local" value={followUp} onChange={(event) => setFollowUp(event.target.value)} /></label>
      <label>{locale === "mn" ? "Ажилтны тэмдэглэл" : "Staff notes"}<textarea rows={6} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} placeholder={locale === "mn" ? "Ярилцсан зүйл, үнийн санал, тохиролцсон дараагийн алхам…" : "Conversation notes, quotation and agreed next step…"} /></label>
      <p className="crm-help">{locale === "mn" ? "Энэ тэмдэглэл харилцагчид харагдахгүй. Хадгалах нь и-мэйл эсвэл зурвас илгээхгүй." : "These notes are private. Saving does not send an email or message to the client."}</p>
      {error && <p className="crm-message crm-error" role="alert">{error}</p>}
      <button type="submit" className="button button-dark" disabled={saving}>{saving ? locale === "mn" ? "Хадгалж байна…" : "Saving…" : locale === "mn" ? "Өөрчлөлтийг хадгалах" : "Save changes"}</button>
      <p className="crm-help">{locale === "mn" ? "Сүүлд шинэчилсэн: " : "Last updated: "}{timeLabel(item.updatedAt, locale)}</p>
    </form>
  </section>;
}
