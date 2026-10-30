"use client";
import { useRef, useState } from "react";
import { facebookUrl, type Locale, type Product } from "@/lib/catalog";
import { t } from "@/lib/copy";
import { Arrow } from "./icons";
import { inquiryPurpose, inquiryPurposes, inquiryPurposeLabels } from "@/lib/inquiry-options";

export function InquiryForm({
  locale,
  products,
  selectedId,
  enabled,
  purpose,
}: {
  locale: Locale;
  products: Product[];
  selectedId?: string;
  enabled: boolean;
  purpose?: string;
}) {
  const c = t(locale);
  const [method, setMethod] = useState("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const key = useRef("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !enabled) return;
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key.current,
        },
        body: JSON.stringify({
          name: form.get("name"),
          contactMethod: method,
          contactValue: form.get("contactValue"),
          message: form.get("message"),
          locale,
          purpose: form.get("purpose"),
          productId: form.get("productId") || undefined,
          website: form.get("website") || "",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(
          data.code === "NOT_CONFIGURED"
            ? c.unavailable
            : response.status === 429
              ? locale === "mn"
                ? "Олон хүсэлт илгээгдсэн байна. 15 минутын дараа дахин оролдоно уу."
                : "Too many enquiries. Please try again in 15 minutes."
              : c.error,
        );
        if (response.status === 400 || response.status === 409)
          key.current = "";
        return;
      }
      setReference(data.reference);
    } catch {
      setError(c.error);
    } finally {
      setBusy(false);
    }
  }
  if (reference)
    return (
      <div className="success-panel" role="status">
        <span className="success-check">✓</span>
        <h2>{c.success}</h2>
        <p>{c.successText}</p>
        <p className="reference-number">{reference}</p>
      </div>
    );
  return (
    <form className="inquiry-form" onSubmit={submit}>
      {!enabled && (
        <div className="form-notice">
          <p>{c.unavailable}</p>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            {c.facebook}
            <Arrow diagonal />
          </a>
        </div>
      )}
      <label>
        {c.product}
        <select
          name="productId"
          defaultValue={
            products.some((p) => p.id === selectedId) ? selectedId : ""
          }
        >
          <option value="">{c.general}</option>
          {products.map((p) => (
            <option value={p.id} key={p.id}>
              {p.id} · {p.name[locale]}
            </option>
          ))}
        </select>
      </label>
      <label>
        {locale === "mn" ? "Танд ямар тусламж хэрэгтэй вэ?" : "How can we help?"}
        <select name="purpose" defaultValue={inquiryPurpose(purpose)}>
          {inquiryPurposes.map(value => <option key={value} value={value}>{inquiryPurposeLabels[value][locale]}</option>)}
        </select>
      </label>
      <label>
        {c.name}
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
        />
      </label>
      <div className="form-row">
        <label>
          {c.method}
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="email">{c.email}</option>
            <option value="phone">{c.phone}</option>
          </select>
        </label>
        <label>
          {method === "email" ? c.email : c.phone}
          <input
            key={method}
            name="contactValue"
            type={method === "email" ? "email" : "tel"}
            autoComplete={method === "email" ? "email" : "tel"}
            required
            maxLength={method === "email" ? 160 : 30}
          />
        </label>
      </div>
      <label>
        {c.message}
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder={c.messagePlaceholder}
        />
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="form-consent">
        {c.consent} <a href={"/" + locale + "/privacy"}>{c.privacy}</a>
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="button button-dark"
        disabled={busy || !enabled}
      >
        {busy ? c.sending : c.send}
        <Arrow />
      </button>
      <p className="detail-note">{c.productNote}</p>
    </form>
  );
}
