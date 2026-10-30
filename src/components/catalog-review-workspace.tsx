"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { categories, categoryIds, isSubcategory, subcategories, type Locale } from "@/lib/catalog";
import { catalogReviewRecordSchema, missingCatalogRequirements, type CatalogReviewFields, type CatalogReviewItem } from "@/lib/catalog-review-contract";
import "@/app/catalog-review.css";

const labels: Record<string, { mn: string; en: string }> = {
  category: { mn: "Үндсэн ангилал", en: "Main category" }, subcategory: { mn: "Дэд ангилал", en: "Subcategory" },
  material: { mn: "Материал, сорьц", en: "Material and fineness" }, dimensions: { mn: "Хэмжээ", en: "Dimensions" },
  condition: { mn: "Нөхцөл байдал, мэдэгдэх гэмтэл", en: "Condition and known damage" },
  weight: { mn: "Жин (мэдэгдэж байвал)", en: "Weight (if known)" }, maker: { mn: "Урлаач (нотлогдсон бол)", en: "Maker (if evidenced)" },
  period: { mn: "Он цаг (нотлогдсон бол)", en: "Period (if evidenced)" }, informationOwner: { mn: "Мэдээлэл хариуцсан хүн", en: "Information owner" },
  photoOwner: { mn: "Зураг хариуцсан хүн", en: "Photo owner" }, evidenceNotes: { mn: "Баримт, эх сурвалжийн дотоод тэмдэглэл", en: "Internal evidence and source notes" },
  "name.mn": { mn: "Монгол нэр", en: "Mongolian name" }, "name.en": { mn: "Англи нэр", en: "English name" },
  "description.mn": { mn: "Монгол тайлбар", en: "Mongolian description" }, "description.en": { mn: "Англи тайлбар", en: "English description" },
  priceMode: { mn: "Үнэ / үнэ лавлах бодлого", en: "Price / enquiry policy" }, availability: { mn: "Бэлэн байдал", en: "Availability" },
  imageRightsConfirmed: { mn: "Зургийг нийтлэх эрхийг шалгасан", en: "Image publication rights checked" },
  distinctItemConfirmed: { mn: "Код нь тусдаа бодит эдлэлтэй таарч, давхардалгүйг шалгасан", en: "Code identifies a distinct item; duplicates checked" },
  factsConfirmed: { mn: "Би энэ хувилбарын мэдээллийг баримттай тулгаж баталгаажуулсан", en: "I verified this version against supporting evidence" },
};

export function CatalogReviewWorkspace({ locale, user }: { locale: Locale; user: User }) {
  const [items, setItems] = useState<CatalogReviewItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const version = useRef(0);
  const mn = locale === "mn";
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setError(""); setNotice(""); setItems([]); setSelectedId("");
    try {
      const response = await fetch("/api/staff/catalog", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store", credentials: "omit" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!Array.isArray(data.items) || data.items.length > 100 || data.items.some((item: CatalogReviewItem) => !catalogReviewRecordSchema.safeParse(item.review).success)) throw new Error();
      if (request === version.current) setItems(data.items);
    } catch { if (request === version.current) setError(mn ? "Бүртгэлийг уншиж чадсангүй. Эрхээ шалгаад дахин ачаална уу." : "Could not load the records. Check your access and refresh."); }
    finally { if (request === version.current) setLoading(false); }
  }, [user, mn]);
  useEffect(() => { void load(); return () => { version.current++; }; }, [load]);
  const selected = items.find((item) => item.product.id === selectedId);
  const published = items.filter((item) => item.product.publicationStatus === "published" && item.product.verificationStatus === "verified").length;
  return <section className="catalog-workspace" aria-labelledby="catalog-review-heading">
    <div className="catalog-review-heading"><div><span className="eyebrow">{mn ? "ЭДЛЭЛИЙН БҮРТГЭЛ" : "CATALOG REVIEW"}</span><h2 id="catalog-review-heading">{mn ? "Баримтаар баталгаажуулж нийтлэх" : "Verify, then publish"}</h2><p>{mn ? "Тодорхойгүй мэдээллийг хоосон үлдээнэ. Ноорог хадгалах нь нийтэд харагдах мэдээллийг өөрчлөхгүй." : "Leave unknown facts blank. Saving a draft does not change the public catalog."}</p></div><button className="crm-secondary" disabled={loading} onClick={() => void load()}>{mn ? "Дахин ачаалах" : "Refresh"}</button></div>
    <p className="catalog-review-summary">{published} / {items.length} {mn ? "эдлэл баталгаажиж нийтлэгдсэн" : "pieces verified and published"}</p>
    {error && <p role="alert" className="crm-message crm-error">{error}</p>}
    {notice && <p role="status" className="crm-message">{notice}</p>}
    {loading ? <p role="status">{mn ? "Бүртгэл уншиж байна…" : "Loading records…"}</p> : <div className="catalog-review-layout">
      <div className="catalog-review-list" aria-label={mn ? "Баталгаажуулах эдлэлүүд" : "Pieces to review"}>
        {items.map((item) => <button type="button" key={item.product.id} className={item.product.id === selectedId ? "catalog-review-card is-selected" : "catalog-review-card"} aria-pressed={item.product.id === selectedId} onClick={() => { setSelectedId(item.product.id); setNotice(""); }}>
          <span>{item.product.id}</span><strong>{item.product.name[locale]}</strong><small>{item.product.publicationStatus === "published" ? mn ? "Нийтлэгдсэн" : "Published" : mn ? "Жишиг · баталгаажуулах" : "Sample · needs verification"} · {missingCatalogRequirements(item.review.fields).length} {mn ? "шалгуур дутуу" : "checks remaining"}</small>
        </button>)}
      </div>
      {selected ? <CatalogReviewEditor key={`${selected.product.id}-${selected.review.revision}`} item={selected} locale={locale} user={user} onSaved={(updated, action) => {
        setItems((old) => old.map((item) => item.product.id === updated.product.id ? { ...item, ...updated } : item));
        setNotice(action === "publish" ? mn ? "Баталгаажсан хувилбарыг нийтэллээ." : "The verified version is published." : mn ? "Дотоод нооргийг хадгаллаа. Нийтийн каталог хэвээр." : "Draft saved. The public catalog is unchanged.");
      }}/> : <p className="catalog-review-empty">{mn ? "Эдлэл сонгож мэдээллийг нягтална уу." : "Choose a piece to review its information."}</p>}
    </div>}
  </section>;
}

function CatalogReviewEditor({ item, locale, user, onSaved }: { item: CatalogReviewItem; locale: Locale; user: User; onSaved: (updated: Pick<CatalogReviewItem, "product" | "review">, action: "save" | "publish") => void }) {
  const mn = locale === "mn";
  // Every editing session asks the current reviewer to attest this exact version anew.
  const [fields, setFields] = useState<CatalogReviewFields>({ ...item.review.fields, factsConfirmed: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const missing = missingCatalogRequirements(fields);
  function change<K extends keyof CatalogReviewFields>(key: K, value: CatalogReviewFields[K]) {
    setFields((old) => ({ ...old, [key]: value, ...(key === "category" ? { subcategory: null } : {}), ...(key === "factsConfirmed" ? {} : { factsConfirmed: false }) }));
  }
  async function save(action: "save" | "publish") {
    if (saving || (action === "publish" && missing.length)) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/staff/catalog/${item.product.id}`, {
        method: "PATCH", headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        credentials: "omit", cache: "no-store", body: JSON.stringify({ action, revision: item.review.revision, fields }),
      });
      if (response.status === 409) { if (alive.current) setError(mn ? "Өөр ажилтан энэ бүртгэлийг шинэчилсэн. Дахин ачаалж шинэ хувилбарыг нягтална уу." : "Another editor changed this record. Refresh and review the latest version."); return; }
      if (!response.ok) throw new Error();
      const body = await response.json();
      if (!catalogReviewRecordSchema.safeParse(body.item?.review).success) throw new Error();
      if (alive.current) onSaved(body.item, action);
    } catch { if (alive.current) setError(mn ? "Хадгалалтыг баталгаажуулж чадсангүй. Дахин ачаалж шалгаад оролдоно уу." : "Could not confirm the save. Refresh before trying again."); }
    finally { if (alive.current) setSaving(false); }
  }
  const simpleFields = ["material", "dimensions", "condition", "weight", "maker", "period", "informationOwner", "photoOwner", "evidenceNotes"] as const;
  return <form className="catalog-review-editor" onSubmit={(event) => { event.preventDefault(); void save("save"); }}>
    <header><span className="eyebrow">{item.product.id}</span><h3>{item.product.name[locale]}</h3><a href={item.source.url} target="_blank" rel="noreferrer">{mn ? "Drive эх зураг" : "Original Drive photo"}: {item.source.fileName}</a></header>
    <p className="catalog-review-help">{mn ? "Зураг, код, хуудасны холбоосыг энэ маягтаар солихгүй. Шинэ зураг болон давхардсан эдлэлийг эх баримттай нь тусад нь нягтална." : "Photo, code and page address stay fixed here. Additional photos and duplicate objects need a separate source review."}</p>
    <fieldset disabled={saving}>
      <legend>{mn ? "Эдлэлийн мэдээлэл" : "Piece information"}</legend>
      <div className="catalog-review-grid">
        {(["name", "description"] as const).flatMap((key) => (["mn", "en"] as const).map((language) => <label key={`${key}.${language}`}>{labels[`${key}.${language}`][locale]}{key === "description" ? <textarea value={fields[key][language]} maxLength={1000} rows={3} onChange={(event) => change(key, { ...fields[key], [language]: event.target.value })}/> : <input value={fields[key][language]} maxLength={160} onChange={(event) => change(key, { ...fields[key], [language]: event.target.value })}/>}</label>))}
        <label>{labels.category[locale]}<select value={fields.category} onChange={(event) => change("category", event.target.value as CatalogReviewFields["category"])}>{categoryIds.map((value) => <option value={value} key={value}>{categories[value][locale]}</option>)}</select></label>
        <label>{labels.subcategory[locale]}<select value={fields.subcategory ?? ""} onChange={(event) => change("subcategory", isSubcategory(fields.category, event.target.value) ? event.target.value : null)}><option value="">{mn ? "Дэд ангилал сонгох" : "Choose a subcategory"}</option>{Object.entries(subcategories[fields.category]).map(([value, label]) => <option value={value} key={value}>{label[locale]}</option>)}</select></label>
        {simpleFields.map((key) => <label key={key}>{labels[key][locale]}{["condition", "evidenceNotes"].includes(key) ? <textarea rows={3} value={fields[key]} maxLength={key === "condition" ? 500 : 1000} onChange={(event) => change(key, event.target.value)}/> : <input value={fields[key]} maxLength={key === "material" ? 300 : key === "weight" || key === "period" ? 150 : key.includes("Owner") ? 160 : 200} onChange={(event) => change(key, event.target.value)}/>}</label>)}
        <label>{labels.priceMode[locale]}<select value={fields.priceMode} onChange={(event) => change("priceMode", event.target.value as CatalogReviewFields["priceMode"])}><option value="unconfirmed">{mn ? "Баталгаажаагүй" : "Unconfirmed"}</option><option value="inquiry">{mn ? "Үнэ лавлах" : "Price on enquiry"}</option><option value="fixed">{mn ? "Үнийг харуулах" : "Show price"}</option></select></label>
        {fields.priceMode === "fixed" && <><label>{mn ? "Үнэ" : "Price"}<input type="number" min="0" max="1000000000000" step="0.01" value={fields.price ?? ""} onChange={(event) => change("price", event.target.value === "" ? null : Number(event.target.value))}/></label><label>{mn ? "Валют" : "Currency"}<select value={fields.currency} onChange={(event) => change("currency", event.target.value as CatalogReviewFields["currency"])}>{["MNT", "USD", "EUR"].map((currency) => <option key={currency}>{currency}</option>)}</select></label></>}
        <label>{labels.availability[locale]}<select value={fields.availability} onChange={(event) => change("availability", event.target.value as CatalogReviewFields["availability"])}><option value="unverified">{mn ? "Баталгаажаагүй" : "Unverified"}</option><option value="available">{mn ? "Бэлэн" : "Available"}</option><option value="sold">{mn ? "Борлогдсон" : "Sold"}</option></select></label>
      </div>
      <div className="catalog-review-checks">{(["imageRightsConfirmed", "distinctItemConfirmed", "factsConfirmed"] as const).map((key) => <label key={key}><input type="checkbox" checked={fields[key]} onChange={(event) => change(key, event.target.checked)}/><span>{labels[key][locale]}</span></label>)}</div>
    </fieldset>
    <p className="catalog-review-help">{mn ? "Жин, урлаач, он цаг тодорхойгүй бол хоосон үлдээнэ. Эх сурвалж, хариуцагч, тэмдэглэл зөвхөн ажилтанд харагдана. Нийтлэхэд таны Google эрх, цаг, өөрчлөлт бүртгэгдэнэ." : "Leave unknown weight, maker and period blank. Evidence, owners and notes stay private. Publication records your Google identity, time and changes."}</p>
    <p className="catalog-review-help">{mn ? "Үндсэн ангиллыг солиход дэд ангиллыг дахин сонгож, мэдээллээ дахин баталгаажуулна. Ангиллын нэр нь материал, сорьцын баталгаа биш." : "Changing the main category clears its subcategory and requires fresh verification. A category name does not verify material or fineness."}</p>
    {missing.length > 0 && <details><summary>{mn ? `Нийтлэхийн өмнө ${missing.length} шалгуур гүйцээнэ` : `${missing.length} requirements remain before publication`}</summary><ul>{missing.map((key) => <li key={key}>{labels[key]?.[locale] ?? key}</li>)}</ul></details>}
    {error && <p className="crm-message crm-error" role="alert">{error}</p>}
    <div className="catalog-review-actions"><button type="submit" className="crm-secondary" disabled={saving}>{saving ? mn ? "Хадгалж байна…" : "Saving…" : mn ? "Ноорог хадгалах" : "Save draft"}</button><button type="button" className="button button-dark" disabled={saving || missing.length > 0} onClick={() => void save("publish")}>{mn ? "Баталгаажуулж нийтлэх" : "Verify and publish"}</button></div>
    {item.review.updatedAt && <p className="catalog-review-help">{mn ? "Сүүлд хадгалсан" : "Last saved"}: {item.review.updatedBy} · {new Date(item.review.updatedAt).toLocaleString(locale === "mn" ? "mn-MN" : "en-GB", { timeZone: "Asia/Ulaanbaatar" })}</p>}
  </form>;
}
