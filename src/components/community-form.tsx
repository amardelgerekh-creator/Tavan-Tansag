"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { categories, categoryIds, type Category, type Locale } from "@/lib/catalog";
import { communityConsentText, communityInputSchema } from "@/lib/community-contract";
import { ContactIcon } from "@/components/contact-icon";

type Values = { email: string; firstName: string; lastName: string; interests: Category[]; consent: boolean; website: string };
type Field = keyof Values;
type FieldErrors = Partial<Record<Field, string>>;
const blankValues = (): Values => ({ email: "", firstName: "", lastName: "", interests: [], consent: false, website: "" });

export function CommunityForm({ locale }: { locale: Locale }) {
  const mn = locale === "mn";
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  const requestKey = useRef("");
  const pending = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const [values, setValues] = useState<Values>(blankValues);
  const [fields, setFields] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "received">("idle");
  const [error, setError] = useState("");
  const busy = status === "sending";

  useEffect(() => () => activeRequest.current?.abort(), []);
  useEffect(() => { requestKey.current = ""; }, [locale]);
  useEffect(() => { if (status === "received") confirmation.current?.focus({ preventScroll: true }); }, [status]);

  const fieldMessage = (field: Field) => ({
    email: mn ? "Зөв и-мэйл хаяг оруулна уу." : "Enter a valid email address.",
    firstName: mn ? "Нэрээ 1–80 тэмдэгтээр оруулна уу." : "Enter your first name, up to 80 characters.",
    lastName: mn ? "Овог 80-аас ихгүй тэмдэгттэй байна." : "Keep your last name within 80 characters.",
    interests: mn ? "Дор хаяж нэг төрлийг сонгоно уу." : "Choose at least one interest.",
    consent: mn ? "Зөвшөөрлөө тэмдэглэсний дараа хүсэлтээ илгээнэ үү." : "Please give your consent before sending your request.",
    website: mn ? "Мэдээллээ шалгаад дахин оролдоно уу." : "Please check your details and try again.",
  })[field];

  function update<K extends Field>(field: K, value: Values[K]) {
    if (pending.current) return;
    setValues((current) => ({ ...current, [field]: value }));
    requestKey.current = "";
    setFields({});
    setError("");
    setStatus("idle");
  }

  function showFields(names: string[]) {
    const next: FieldErrors = {};
    for (const name of names) if (Object.hasOwn(values, name)) next[name as Field] = fieldMessage(name as Field);
    setFields(next);
    const first = ["email", "firstName", "lastName", "interests", "consent"].find((name) => Object.hasOwn(next, name));
    if (first) requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setFields({});
    setError("");
    const parsed = communityInputSchema.safeParse({ ...values, locale });
    if (!parsed.success) {
      showFields(parsed.error.issues.map((issue) => String(issue.path[0])));
      setError(mn ? "Доорх мэдээллээ шалгана уу." : "Please review the fields below.");
      setStatus("error");
      return;
    }
    pending.current = true;
    setStatus("sending");
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      if (!requestKey.current) requestKey.current = crypto.randomUUID();
      const response = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey.current },
        body: JSON.stringify(parsed.data),
        signal: controller.signal,
      });
      const result = await response.json();
      if (response.status === 202 && result?.ok === true && result.code === "REQUEST_RECEIVED") {
        setValues(blankValues());
        requestKey.current = "";
        setStatus("received");
        return;
      }
      if (result?.code === "VALIDATION_ERROR") {
        showFields(result.fields && typeof result.fields === "object" ? Object.keys(result.fields) : []);
        setError(mn ? "Мэдээллээ шалгаад дахин илгээнэ үү." : "Please check your details and send your request again.");
      } else if (response.status === 429 || result?.code === "RATE_LIMITED") {
        setError(mn ? "Олон хүсэлт ирсэн байна. 15 минутын дараа дахин оролдоно уу." : "Too many requests. Please try again in 15 minutes.");
      } else if (result?.code === "IDEMPOTENCY_CONFLICT" || result?.code === "INVALID_IDEMPOTENCY_KEY") {
        requestKey.current = "";
        setError(mn ? "Хүсэлтийг дахин илгээнэ үү." : "Please send your request again.");
      } else if (result?.code === "NOT_CONFIGURED" || result?.code === "PERSISTENCE_UNAVAILABLE") {
        setError(mn ? "Хүсэлт хүлээн авах түр боломжгүй байна. Дараа дахин оролдоно уу." : "We cannot receive your request right now. Please try again shortly.");
      } else {
        setError(mn ? "Хүсэлт хүлээн авсныг баталгаажуулж чадсангүй. Дахин оролдоно уу." : "We could not confirm receipt of your request. Please try again.");
      }
      setStatus("error");
    } catch {
      setError(mn ? "Холболт тасарлаа. Мэдээллээ хэвээр нь дахин илгээж болно." : "The connection was interrupted. You can retry with the same details.");
      setStatus("error");
    } finally {
      clearTimeout(timeout);
      activeRequest.current = null;
      pending.current = false;
    }
  }

  if (status === "received") return (
    <div className="community-received" ref={confirmation} role="status" tabIndex={-1}>
      <span className="community-received-mark" aria-hidden="true">✓</span>
      <h3>{mn ? "Хүсэлтийг тань хүлээн авлаа." : "Your request has been received."}</h3>
      <p>{mn ? "Таван Тансагийн хүрээллийг сонирхсонд баярлалаа. Манай баг таны өгсөн и-мэйл хаягаар холбогдох боломжтой." : "Thank you for your interest in the Tavan Tansag community. Our team can contact you at the email address you provided."}</p>
    </div>
  );

  return (
    <form ref={form} className="community-form" onSubmit={submit} noValidate aria-busy={busy}>
      <p className="community-required-note">{mn ? "* Заавал бөглөх мэдээлэл" : "* Required fields"}</p>
      <fieldset className="community-fields" disabled={busy}>
        <div className="community-line-field">
          <label htmlFor={`${id}-email`}>{mn ? "И-мэйл хаяг" : "Email address"} *</label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} value={values.email} onChange={(event) => update("email", event.target.value)} aria-invalid={Boolean(fields.email)} aria-describedby={fields.email ? `${id}-email-error` : undefined} />
          {fields.email && <p className="community-field-error" id={`${id}-email-error`}>{fields.email}</p>}
        </div>
        <div className="community-name-fields">
          <div className="community-line-field">
            <label htmlFor={`${id}-firstName`}>{mn ? "Нэр" : "First name"} *</label>
            <input id={`${id}-firstName`} name="firstName" autoComplete="given-name" required maxLength={80} value={values.firstName} onChange={(event) => update("firstName", event.target.value)} aria-invalid={Boolean(fields.firstName)} aria-describedby={fields.firstName ? `${id}-firstName-error` : undefined} />
            {fields.firstName && <p className="community-field-error" id={`${id}-firstName-error`}>{fields.firstName}</p>}
          </div>
          <div className="community-line-field">
            <label htmlFor={`${id}-lastName`}>{mn ? "Овог (заавал биш)" : "Last name (optional)"}</label>
            <input id={`${id}-lastName`} name="lastName" autoComplete="family-name" maxLength={80} value={values.lastName} onChange={(event) => update("lastName", event.target.value)} aria-invalid={Boolean(fields.lastName)} aria-describedby={fields.lastName ? `${id}-lastName-error` : undefined} />
            {fields.lastName && <p className="community-field-error" id={`${id}-lastName-error`}>{fields.lastName}</p>}
          </div>
        </div>
        <fieldset className="community-interests" aria-describedby={`${id}-interests-note${fields.interests ? ` ${id}-interests-error` : ""}`}>
          <legend>{mn ? "Таны сонирхдог эдлэл" : "Your interests"} *</legend>
          <p id={`${id}-interests-note`}>{mn ? "Нэг эсвэл хэд хэдэн төрлийг сонгоорой." : "Choose one or more categories."}</p>
          <div className="community-interest-options">
            {categoryIds.map((category) => (
              <label className="community-check" key={category}>
                <input name="interests" type="checkbox" value={category} checked={values.interests.includes(category)} onChange={(event) => update("interests", event.target.checked ? [...values.interests, category] : values.interests.filter((current) => current !== category))} aria-invalid={Boolean(fields.interests)} />
                <span>{categories[category][locale]}</span>
              </label>
            ))}
          </div>
          {fields.interests && <p className="community-field-error" id={`${id}-interests-error`}>{fields.interests}</p>}
        </fieldset>
        <div className="community-honeypot" aria-hidden="true">
          <label htmlFor={`${id}-website`}>Website</label>
          <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(event) => update("website", event.target.value)} />
        </div>
        <div className="community-consent">
          <label className="community-check">
            <input name="consent" type="checkbox" required checked={values.consent} onChange={(event) => update("consent", event.target.checked)} aria-invalid={Boolean(fields.consent)} aria-describedby={fields.consent ? `${id}-consent-error` : undefined} />
            <span>{communityConsentText[locale]}</span>
          </label>
          <Link href={`/${locale}/privacy`}>{mn ? "Мэдээллийн нууцлал" : "Privacy notice"}</Link>
          {fields.consent && <p className="community-field-error" id={`${id}-consent-error`}>{fields.consent}</p>}
        </div>
      </fieldset>
      {error && <p className="community-submit-error" role="alert">{error}</p>}
      <button className="community-submit" type="submit" disabled={busy}>
        <span>{busy ? (mn ? "Илгээж байна…" : "Sending…") : status === "error" ? (mn ? "Дахин илгээх" : "Try again") : (mn ? "Нэгдэх хүсэлт илгээх" : "Send request to join")}</span>
        <ContactIcon kind="arrow" />
      </button>
    </form>
  );
}
