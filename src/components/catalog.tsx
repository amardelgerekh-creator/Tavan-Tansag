"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { type Locale, type Product } from "@/lib/catalog";
import { t } from "@/lib/copy";
import { SearchIcon } from "./icons";
import { ProductCard } from "./site";
import { CatalogCategories } from "./catalog-categories";
import { filterProducts, readCatalogFilters, updateCatalogSearch, type CatalogFilters } from "@/lib/product-presentation";
import "@/app/catalog-taxonomy.css";

type CatalogProps = { products: Product[]; locale: Locale };

export function Catalog(props: CatalogProps) {
  return <Suspense fallback={<><p role="status" className="catalog-loading">{props.locale === "mn" ? "Ангиллыг бэлтгэж байна…" : "Preparing the collection…"}</p><div className="product-grid">{props.products.map((product, index) => <ProductCard key={product.id} product={product} locale={props.locale} priority={index < 3} />)}</div></>}><CatalogWithFilters {...props} /></Suspense>;
}

function CatalogWithFilters({ products, locale }: CatalogProps) {
  const c = t(locale);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { category, subcategory, query } = readCatalogFilters(searchParams);
  const filtered = useMemo(() => filterProducts(products, category, query, subcategory), [products, category, query, subcategory]);
  const emptyCategory = category !== "all" && filterProducts(products, category, "", subcategory).length === 0;

  function changeFilters(change: Partial<CatalogFilters>, replace = false) {
    const next = updateCatalogSearch(window.location.search, change);
    const href = pathname + (next ? `?${next}` : "") + window.location.hash;
    if (replace) window.history.replaceState(null, "", href);
    else window.history.pushState(null, "", href);
  }
  function reset() { changeFilters({ category: "all", subcategory: "all", query: "" }); }

  return <>
    <div className="catalog-controls catalog-controls-taxonomy">
      <CatalogCategories products={products} locale={locale} category={category} subcategory={subcategory} onCategory={(value) => changeFilters({ category: value })} onSubcategory={(value) => changeFilters({ subcategory: value })} />
      <label className="search-field"><SearchIcon /><input type="search" autoComplete="off" maxLength={240} value={query} onChange={(event) => changeFilters({ query: event.target.value }, true)} placeholder={c.search} aria-label={c.search} /></label>
    </div>
    <div className="catalog-count" aria-live="polite"><span className="catalog-result-total">{filtered.length} {c.results}</span>{query || category !== "all" ? <button type="button" className="text-link" onClick={reset}>{c.reset}</button> : <span>{locale === "mn" ? "СОНГОСОН ЭДЛЭЛҮҮД" : "CURATED OBJECTS"}</span>}</div>
    {filtered.length ? <div className="product-grid">{filtered.map((product, index) => <ProductCard key={product.id} product={product} locale={locale} priority={index < 3} />)}</div> : <div className="empty-state catalog-empty">
      <h2>{emptyCategory ? (locale === "mn" ? "Энэ ангилалд одоогоор бүртгэл алга." : "No pieces are listed in this category yet.") : c.noResults}</h2>
      <p>{locale === "mn" ? "Сонирхсон эдлэлийнхээ талаар зөвлөгөө авч, боломж болон бэлэн байдлыг манай багаас тодруулаарай." : "Tell our team what you are looking for. We can help clarify options and availability."}</p>
      <div className="catalog-empty-actions"><Link className="button button-dark" href={`/${locale}/inquiry`}>{c.enquire}</Link><button type="button" className="text-link" onClick={reset}>{c.reset}</button></div>
    </div>}
  </>;
}
