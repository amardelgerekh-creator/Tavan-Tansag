"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { Locale } from "@/lib/catalog";
import { crmStatuses } from "@/lib/crm-contract";
import { crmMetricsSchema, metricPeriods, type CrmMetricsData, type MetricPeriod } from "@/lib/crm-metrics-contract";
import "@/app/crm-metrics.css";

const statusNames = {
  mn: ["Шинэ", "Холбогдсон", "Зөвлөгөө өгсөн", "Үнийн санал өгсөн", "Борлуулсан", "Хаасан"],
  en: ["New", "Contacted", "Consultation", "Quoted", "Marked sold", "Closed"],
};

export function CrmMetrics({ locale, user, refreshKey = 0 }: { locale: Locale; user: User; refreshKey?: number }) {
  const [days, setDays] = useState<MetricPeriod>(30);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<CrmMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mn = locale === "mn";

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setData(null); setLoading(true); setError(false);
    void (async () => {
      try {
        const token = await user.getIdToken();
        if (!active) return;
        const response = await fetch(`/api/staff/metrics?days=${days}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store", credentials: "omit", signal: controller.signal,
        });
        if (!response.ok) throw new Error("METRICS_UNAVAILABLE");
        const body = await response.json();
        const metrics = crmMetricsSchema.parse(body.metrics);
        if (active) setData(metrics);
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; controller.abort(); };
  }, [user, days, reload, refreshKey]);

  return <section className="crm-metrics" aria-labelledby="crm-metrics-heading" aria-busy={loading}>
    <div className="crm-metrics-heading">
      <div><span className="eyebrow">{mn ? "ХҮСЭЛТИЙН ҮР ДҮН" : "ENQUIRY OUTCOMES"}</span><h2 id="crm-metrics-heading">{mn ? "Сонирхлоос борлуулалт хүртэл" : "From enquiry to sale"}</h2></div>
      <div className="crm-metrics-controls"><label>{mn ? "Хугацаа" : "Period"}<select value={days} onChange={(event) => setDays(Number(event.target.value) as MetricPeriod)}>{metricPeriods.map((period) => <option value={period} key={period}>{mn ? `Сүүлийн ${period} хоног` : `Last ${period} days`}</option>)}</select></label><button type="button" className="crm-secondary" disabled={loading} onClick={() => setReload((value) => value + 1)}>{mn ? "Тоо шинэчлэх" : "Refresh totals"}</button></div>
    </div>
    <p className="crm-metrics-note">{mn ? "Сонгосон хугацаанд ирсэн бүх хүсэлтийг тоолно. Үр дүн нь хүсэлтийн одоогийн төлөвөөр харагдана; хуудасны үзэлт эсвэл давхардалгүй хэрэглэгчийн тоо биш." : "Counts every enquiry received in this period, using its current status. These are enquiries, not page views or unique visitors."}</p>
    {loading && <p role="status">{mn ? "Үр дүнг тооцоолж байна…" : "Calculating outcomes…"}</p>}
    {error && <p className="crm-message crm-error" role="alert">{mn ? "Хэмжилтийг уншиж чадсангүй. Дахин шинэчилнэ үү." : "Could not load the totals. Please refresh."}</p>}
    {data && <>
      <dl className="crm-metrics-cards">
        <div><dt>{mn ? "Нийт хүсэлт" : "Enquiries"}</dt><dd>{data.total}</dd></div>
        <div><dt>{mn ? "Хөтөлж буй" : "Open enquiries"}</dt><dd>{data.open}</dd></div>
        <div><dt>{mn ? "Борлуулсан гэж тэмдэглэсэн" : "Marked sold by staff"}</dt><dd>{data.won}</dd></div>
        <div><dt>{mn ? "Холбоо барих хугацаа болсон" : "Follow-up due"}</dt><dd>{data.overdue}</dd></div>
      </dl>
      <div className="crm-metrics-breakdown"><dl>{crmStatuses.map((status, index) => <div key={status}><dt>{statusNames[locale][index]}</dt><dd>{data.byStatus[status]}</dd></div>)}</dl><p>{mn ? `Монгол: ${data.byLocale.mn} · Англи: ${data.byLocale.en} · Товлосон холбоо: ${data.scheduled}` : `Mongolian: ${data.byLocale.mn} · English: ${data.byLocale.en} · Upcoming follow-ups: ${data.scheduled}`}</p></div>
      {data.products.length ? <div className="crm-metrics-table-wrap"><table><caption>{mn ? "Аль эдлэл хүсэлт үүсгэж байна вэ?" : "Which pieces generate enquiries?"}</caption><thead><tr><th scope="col">{mn ? "Эдлэл" : "Piece"}</th><th scope="col">{mn ? "Хүсэлт" : "Enquiries"}</th><th scope="col">MN / EN</th><th scope="col">{mn ? "Хөтөлж буй" : "Open"}</th><th scope="col">{mn ? "Борлуулсан" : "Marked sold"}</th></tr></thead><tbody>{data.products.map((product) => <tr key={product.productId ?? "general"}><th scope="row">{product.productId ?? (mn ? "Ерөнхий зөвлөгөө" : "General enquiry")}</th><td>{product.inquiries}</td><td>{product.mn} / {product.en}</td><td>{product.open}</td><td>{product.won}</td></tr>)}</tbody></table></div> : <p className="crm-metrics-empty">{mn ? "Энэ хугацаанд хүсэлт бүртгэгдээгүй. Шинэ хүсэлт ирмэгц бодит тоонууд энд харагдана." : "No enquiries were received in this period. Actual totals will appear as enquiries arrive."}</p>}
      <p className="crm-metrics-note">{mn ? "«Борлуулсан» нь ажилтны тэмдэглэсэн үр дүн; төлбөрийн баримт эсвэл орлогын тооцоо биш. Холбоо барих үзүүлэлт нь энэ хугацаанд ирсэн, хаагдаагүй хүсэлтүүдэд хамаарна." : "Marked sold reflects staff-entered outcomes, not payment verification or revenue. Follow-up totals apply to open enquiries received in the selected period."}</p>
      <p className="crm-metrics-timestamp">{mn ? "Тооцоолсон: " : "Calculated: "}<time dateTime={data.through}>{new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ulaanbaatar" }).format(new Date(data.through))}</time> · {mn ? "Улаанбаатар" : "Ulaanbaatar"}</p>
    </>}
  </section>;
}
