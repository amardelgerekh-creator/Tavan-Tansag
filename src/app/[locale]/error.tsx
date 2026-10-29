"use client";
import { useParams } from "next/navigation";
import { facebookUrl } from "@/lib/catalog";

export default function CatalogError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const params = useParams();
  const mn = params.locale === "mn";
  return (
    <section className="container section">
      <div className="page-heading">
        <span className="eyebrow">TAVAN TANSAG</span>
        <h1>
          {mn
            ? "Каталог түр ачаалагдахгүй байна."
            : "The catalog is temporarily unavailable."}
        </h1>
        <p>
          {mn
            ? "Түр хүлээгээд дахин оролдоно уу. Эсвэл манай Facebook хуудсаар холбогдоорой."
            : "Please try again shortly, or contact us through our Facebook page."}
        </p>
      </div>
      <button className="button button-dark" onClick={() => retry()}>
        {mn ? "Дахин оролдох" : "Try again"}
      </button>{" "}
      <a
        href={facebookUrl}
        className="text-link"
        target="_blank"
        rel="noreferrer"
      >
        Facebook ↗
      </a>
    </section>
  );
}
