"use client";
import { useMemo, useState } from "react";
import {
  categories,
  type Category,
  type Locale,
  type Product,
} from "@/lib/catalog";
import { t } from "@/lib/copy";
import { SearchIcon } from "./icons";
import { ProductCard } from "./site";

export function Catalog({
  products,
  locale,
}: {
  products: Product[];
  locale: Locale;
}) {
  const c = t(locale);
  const [category, setCategory] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const available = Object.keys(categories).filter((key) =>
    products.some((p) => p.category === key),
  ) as Category[];
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === "all" || p.category === category) &&
          [p.name.mn, p.name.en, p.id, categories[p.category]?.[locale]]
            .join(" ")
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [products, category, query, locale],
  );
  return (
    <>
      <div className="catalog-controls">
        <div className="category-tabs" role="group" aria-label={c.category}>
          <button
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
          >
            {c.all}
          </button>
          {available.map((key) => (
            <button
              key={key}
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
            >
              {categories[key][locale]}
            </button>
          ))}
        </div>
        <label className="search-field">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.search}
            aria-label={c.search}
          />
        </label>
      </div>
      <div className="catalog-count" aria-live="polite">
        {filtered.length} {c.results}
        <span>{locale === "mn" ? "СОНГОСОН ЭДЛЭЛҮҮД" : "CURATED OBJECTS"}</span>
      </div>
      {filtered.length ? (
        <div className="product-grid">
          {filtered.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              locale={locale}
              priority={i < 3}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{c.noResults}</h2>
          <button
            className="text-link"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
          >
            {c.reset}
          </button>
        </div>
      )}
    </>
  );
}
