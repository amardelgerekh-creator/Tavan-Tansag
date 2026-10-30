"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { categories, type Locale } from "@/lib/catalog";
import { communityPageSchema, communityRecordSchema, communityStatuses, type CommunityRecord, type CommunityStatus } from "@/lib/community-contract";
import "@/app/community-workspace.css";

const statusLabels: Record<CommunityStatus, Record<Locale, string>> = {
  requested: { mn: "Хүсэлт ирсэн", en: "Requested" },
  contacted: { mn: "Холбогдсон", en: "Contacted" },
  withdrawn: { mn: "Зөвшөөрлөө цуцалсан", en: "Withdrawn" },
};

function dateLabel(value: string, locale: Locale) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ulaanbaatar",
  }).format(date);
}

function fullName(item: CommunityRecord) {
  return [item.firstName, item.lastName].filter(Boolean).join(" ");
}

export function CommunityWorkspace({ locale, user }: { locale: Locale; user: User }) {
  const mn = locale === "mn";
  const [status, setStatus] = useState<CommunityStatus | "">("");
  const [items, setItems] = useState<CommunityRecord[]>([]);
  const [selected, setSelected] = useState<CommunityRecord | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const active = useRef(false);
  const version = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const invalidateRequest = useCallback(() => {
    version.current += 1;
    controller.current?.abort();
    controller.current = null;
  }, []);

  const clearRecords = useCallback(() => {
    setItems([]); setSelected(null); setHasMore(false); setNextCursor(null);
  }, []);

  const accessFailed = useCallback(() => {
    invalidateRequest(); clearRecords(); setLoading(false); setNotice("");
    setError(mn ? "Ажилтны эрхийг баталгаажуулж чадсангүй. Гараад зөвшөөрөгдсөн эрхээр дахин нэвтэрнэ үү." : "Your staff access could not be verified. Sign out and sign in with an authorized account.");
  }, [invalidateRequest, clearRecords, mn]);

  const load = useCallback(async (cursor?: string) => {
    invalidateRequest();
    const current = version.current;
    const request = new AbortController();
    controller.current = request;
    const isCurrent = () => active.current && current === version.current && !request.signal.aborted;
    setLoading(true); setError("");
    if (!cursor) clearRecords();
    try {
      const token = await user.getIdToken();
      if (!isCurrent()) return;
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (cursor) params.set("before", cursor);
      const response = await fetch(`/api/staff/community?${params}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", credentials: "omit", signal: request.signal,
      });
      if (!isCurrent()) return;
      if (response.status === 401 || response.status === 403) { accessFailed(); return; }
      if (!response.ok) throw new Error("COMMUNITY_UNAVAILABLE");
      const page = communityPageSchema.parse(await response.json());
      if (!isCurrent()) return;
      setItems(previous => cursor ? [...previous, ...page.items.filter(item => !previous.some(old => old.id === item.id))] : page.items);
      setHasMore(page.hasMore); setNextCursor(page.nextCursor);
    } catch {
      if (isCurrent()) setError(mn ? "Бүртгэлийн хүсэлтүүдийг уншиж чадсангүй. Дахин шинэчилнэ үү." : "Could not load community requests. Please refresh the list.");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [invalidateRequest, clearRecords, accessFailed, user, status, mn]);

  useEffect(() => {
    active.current = true;
    void load();
    return () => { active.current = false; invalidateRequest(); };
  }, [load, invalidateRequest]);

  return <section className="community-workspace" aria-labelledby="community-workspace-title">
    <div className="community-workspace-heading">
      <span className="eyebrow">{mn ? "ТАВАН ТАНСАГИЙН ХҮРЭЭЛЭЛ" : "TAVAN TANSAG COMMUNITY"}</span>
      <h2 id="community-workspace-title">{mn ? "Хүрээллийн хүсэлт" : "Community requests"}</h2>
      <p>{mn ? "Шинэ эдлэл, өв соёлын нийтлэл, үйл явдлын мэдээлэл авах хүсэлтүүд. И-мэйл хаягийн эзэмшигчийг баталгаажуулаагүй; энэ жагсаалт нь баталгаажсан захиалагчдын бүртгэл биш." : "Requests for collection, heritage story and event updates. Email ownership has not been verified; these are requests, not verified subscriptions."}</p>
    </div>
    {error && <p className="crm-message crm-error" role="alert">{error}</p>}
    {notice && <p className="crm-message" role="status">{notice}</p>}
    <div className="crm-toolbar">
      <label>{mn ? "Төлөв" : "Status"}<select value={status} onChange={event => { invalidateRequest(); clearRecords(); setNotice(""); setStatus(event.target.value as CommunityStatus | ""); }}>
        <option value="">{mn ? "Бүх төлөв" : "All statuses"}</option>
        {communityStatuses.map(value => <option value={value} key={value}>{statusLabels[value][locale]}</option>)}
      </select></label>
      <span className="crm-result-count">{items.length} {mn ? "хүсэлт ачаалсан" : "requests loaded"}</span>
      <button type="button" className="crm-secondary" disabled={loading} onClick={() => { setNotice(""); void load(); }}>{loading ? mn ? "Уншиж байна…" : "Loading…" : mn ? "Шинэчлэх" : "Refresh"}</button>
    </div>
    <div className="crm-workspace">
      <section className="crm-list" aria-label={mn ? "Хүрээллийн хүсэлтийн жагсаалт" : "Community request list"} aria-busy={loading}>
        {!items.length && loading && <p className="crm-empty" role="status">{mn ? "Хүсэлтүүдийг уншиж байна…" : "Loading requests…"}</p>}
        {!items.length && !loading && !error && <div className="crm-empty"><h3>{mn ? "Хүсэлт алга" : "No requests yet"}</h3><p>{mn ? "Сонгосон төлөвийн хүсэлтүүд энд харагдана." : "Requests matching this status will appear here."}</p></div>}
        {items.map(item => <button type="button" className={`crm-list-item${selected?.id === item.id ? " is-selected" : ""}`} key={item.id} aria-pressed={selected?.id === item.id} aria-controls={selected?.id === item.id ? "community-detail-panel" : undefined} onClick={() => { setSelected(item); setNotice(""); }}>
          <span className="crm-item-top"><strong>{fullName(item)}</strong><span className={`crm-badge community-status-${item.status}`}>{statusLabels[item.status][locale]}</span></span>
          <span className="community-item-email">{item.email}</span>
          <span className="crm-item-message">{item.interests.map(category => categories[category][locale]).join(" · ") || (mn ? "Сонирхлоо сонгоогүй" : "No interests selected")}</span>
          <span className="crm-item-bottom"><time dateTime={item.createdAt}>{dateLabel(item.createdAt, locale)}</time><span>{item.locale === "mn" ? "Монгол" : "English"}</span></span>
        </button>)}
        {hasMore && nextCursor && <button type="button" className="crm-secondary crm-load-more" disabled={loading} onClick={() => void load(nextCursor)}>{mn ? "Өмнөх хүсэлтүүд" : "Load earlier requests"}</button>}
      </section>
      {selected ? <CommunityEditor key={`${selected.id}-${selected.revision}`} item={selected} locale={locale} user={user} onClose={() => setSelected(null)} onAccessFailed={accessFailed} onConflict={() => {
        setNotice(mn ? "Энэ хүсэлт өөрчлөгдсөн тул засварыг хадгалаагүй. Шинэчилсэн жагсаалтаас дахин сонгоно уу." : "This request changed, so your edit was not saved. Select it again from the refreshed list.");
        void load();
      }} onSaved={item => {
        if (!active.current) return;
        invalidateRequest(); setLoading(false);
        setItems(previous => previous.map(old => old.id === item.id ? item : old).filter(entry => !status || entry.status === status));
        setSelected(!status || item.status === status ? item : null);
        setNotice(mn ? "Төлөвийг хадгаллаа. И-мэйл илгээгээгүй." : "Status saved. No email was sent.");
      }} /> : <aside className="crm-selection-placeholder"><span aria-hidden="true">↖</span><p>{mn ? "Хүсэлт сонгож мэдээлэл, зөвшөөрлийг харна уу." : "Select a request to review its details and consent."}</p></aside>}
    </div>
    <p className="crm-footnote">{mn ? "Цагийг Улаанбаатарын цагаар харуулна. Мэдээлэл зөвхөн эрх бүхий ажилтанд зориулагдсан." : "Times are shown in Ulaanbaatar time. Personal details are for authorized staff only."}</p>
  </section>;
}

function CommunityEditor({ item, locale, user, onClose, onSaved, onConflict, onAccessFailed }: {
  item: CommunityRecord; locale: Locale; user: User; onClose: () => void; onSaved: (item: CommunityRecord) => void; onConflict: () => void; onAccessFailed: () => void;
}) {
  const mn = locale === "mn";
  const [status, setStatus] = useState(item.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    mounted.current = true;
    heading.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 950px)").matches) heading.current?.scrollIntoView({ behavior: "instant", block: "start" });
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || status === item.status || item.status === "withdrawn") return;
    busy.current = true;
    setSaving(true); setError("");
    const request = new AbortController();
    controller.current = request;
    const isCurrent = () => mounted.current && !request.signal.aborted;
    try {
      const token = await user.getIdToken();
      if (!isCurrent()) return;
      const response = await fetch(`/api/staff/community/${encodeURIComponent(item.id)}`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ revision: item.revision, status }), cache: "no-store", credentials: "omit", signal: request.signal,
      });
      if (!isCurrent()) return;
      if (response.status === 409) { onConflict(); return; }
      if (response.status === 401 || response.status === 403) { onAccessFailed(); return; }
      if (!response.ok) throw new Error("COMMUNITY_SAVE_FAILED");
      const body = await response.json();
      const updated = communityRecordSchema.parse(body.item);
      if (updated.id !== item.id) throw new Error("INVALID_RESPONSE");
      if (isCurrent()) onSaved(updated);
    } catch {
      if (isCurrent()) setError(mn ? "Хадгалсан эсэхийг баталгаажуулж чадсангүй. Дахин оролдохын өмнө жагсаалтыг шинэчилж шалгана уу." : "Could not confirm the save. Refresh the list before trying again.");
    } finally {
      if (isCurrent()) { busy.current = false; setSaving(false); }
    }
  }

  return <section className="crm-detail community-detail" id="community-detail-panel" aria-labelledby="community-detail-title">
    <div className="crm-detail-heading"><div><span className="eyebrow">{mn ? "БҮРТГЭЛИЙН ХҮСЭЛТ" : "COMMUNITY REQUEST"}</span><h3 id="community-detail-title" ref={heading} tabIndex={-1}>{fullName(item)}</h3></div><button type="button" className="crm-secondary" onClick={onClose}>{mn ? "Хаах" : "Close"}</button></div>
    <p className="community-verification-note">{mn ? "И-мэйл хаягийн эзэмшигчийг баталгаажуулаагүй." : "Email ownership has not been verified."}</p>
    {item.status === "withdrawn" && <p className="crm-message">{mn ? "Энэ хүсэлтийн зөвшөөрлийг цуцалсан. Шинэ мэдээлэл илгээх жагсаалтад бүү оруулна уу." : "Consent for this request has been withdrawn. Do not include it in update mailings."}</p>}
    <dl className="crm-facts">
      <div><dt>{mn ? "Нэр" : "First name"}</dt><dd>{item.firstName}</dd></div>
      <div><dt>{mn ? "Овог" : "Last name"}</dt><dd>{item.lastName || (mn ? "Оруулаагүй" : "Not provided")}</dd></div>
      <div><dt>{mn ? "И-мэйл" : "Email"}</dt><dd>{item.email}</dd></div>
      <div><dt>{mn ? "Сонирхол" : "Interests"}</dt><dd>{item.interests.map(category => categories[category][locale]).join(" · ") || (mn ? "Сонгоогүй" : "Not selected")}</dd></div>
      <div><dt>{mn ? "Хэл" : "Language"}</dt><dd>{item.locale === "mn" ? "Монгол" : "English"}</dd></div>
      <div><dt>{mn ? "Зөвшөөрөл өгсөн" : "Consent recorded"}</dt><dd><time dateTime={item.consentAt}>{dateLabel(item.consentAt, locale)}</time></dd></div>
      <div><dt>{mn ? "Зөвшөөрлийн хувилбар" : "Consent version"}</dt><dd>{item.consentVersion}</dd></div>
      <div><dt>{mn ? "Бүртгэгдсэн" : "Received"}</dt><dd><time dateTime={item.createdAt}>{dateLabel(item.createdAt, locale)}</time></dd></div>
      <div><dt>{mn ? "Одоогийн төлөв" : "Current status"}</dt><dd>{statusLabels[item.status][locale]}</dd></div>
    </dl>
    <form onSubmit={save} className="crm-edit-form">
      <label>{mn ? "Төлөв өөрчлөх" : "Change status"}<select value={status} disabled={saving || item.status === "withdrawn"} onChange={event => setStatus(event.target.value as CommunityStatus)}>{communityStatuses.map(value => <option value={value} key={value}>{statusLabels[value][locale]}</option>)}</select></label>
      <p className="crm-help">{mn ? "Зөвхөн бодитоор холбогдсоны дараа «Холбогдсон» гэж тэмдэглэнэ. Цуцалсан хүсэлтийг энд дахин идэвхжүүлэх боломжгүй; шинэ зөвшөөрлийг баталгаажуулж бүртгэх тусдаа үйл явц шаардлагатай. Төлөв хадгалах нь и-мэйл илгээхгүй, и-мэйл хаягийг баталгаажуулахгүй." : "Mark Contacted only after actual contact. Withdrawn requests cannot be reopened here; that requires a separate process to verify and record fresh consent. Saving a status does not send email or verify email ownership."}</p>
      {error && <p className="crm-message crm-error" role="alert">{error}</p>}
      <button type="submit" className="button button-dark" disabled={saving || status === item.status || item.status === "withdrawn"}>{saving ? mn ? "Хадгалж байна…" : "Saving…" : mn ? "Төлөвийг хадгалах" : "Save status"}</button>
      <p className="crm-help">{mn ? "Сүүлд шинэчилсэн: " : "Last updated: "}{dateLabel(item.updatedAt, locale)}</p>
    </form>
  </section>;
}
