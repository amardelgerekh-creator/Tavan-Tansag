"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef } from "react";
import { categories, subcategories, type Locale, type Product } from "@/lib/catalog";
import { t } from "@/lib/copy";
import { Arrow, SearchIcon } from "./icons";
import { ProductCard } from "./site";
import { CatalogCategories } from "./catalog-categories";
import { filterProducts, readCatalogFilters, updateCatalogSearch, type CatalogFilters } from "@/lib/product-presentation";
import "@/app/catalog-taxonomy.css";

type CatalogProps = { products: Product[]; locale: Locale };

export function Catalog(props: CatalogProps) {
  return <Suspense fallback={<div className="catalog-pending" aria-busy="true"><p role="status" className="catalog-loading">{props.locale === "mn" ? "Ангиллыг бэлтгэж байна…" : "Preparing the collection…"}</p><div className="catalog-placeholder-controls" aria-hidden="true" /><div className="catalog-placeholder-grid" aria-hidden="true"><span /><span /><span /></div><noscript>{props.locale === "mn" ? "Каталогийн хайлтыг ашиглахын тулд JavaScript-ээ идэвхжүүлнэ үү." : "Please enable JavaScript to browse and filter the collection."}</noscript></div>}><CatalogWithFilters {...props} /></Suspense>;
}

function CatalogWithFilters({ products, locale }: CatalogProps) {
  const c = t(locale);
  const mn = locale === "mn";
  const searchInput = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { category, subcategory, query } = readCatalogFilters(searchParams);
  const filtered = useMemo(() => filterProducts(products, category, query, subcategory), [products, category, query, subcategory]);
  const emptyCategory = category !== "all" && filterProducts(products, category, "", subcategory).length === 0;
  const categoryName = category === "all" ? c.all : categories[category][locale];
  const subcategoryName = category !== "all" && subcategory !== "all" ? subcategories[category][subcategory]?.[locale] : null;
  const hasFilters = category !== "all" || Boolean(query);

  function changeFilters(change: Partial<CatalogFilters>, replace = false) {
    const next = updateCatalogSearch(window.location.search, change);
    const href = pathname + (next ? `?${next}` : "") + window.location.hash;
    if (replace) window.history.replaceState(null, "", href);
    else window.history.pushState(null, "", href);
  }
  function reset() { changeFilters({ category: "all", subcategory: "all", query: "" }); }
  function clearSearch() {
    changeFilters({ query: "" });
    searchInput.current?.focus();
  }

  return <>
    <div className="catalog-controls catalog-controls-taxonomy">
      <CatalogCategories products={products} locale={locale} category={category} subcategory={subcategory} onCategory={(value) => changeFilters({ category: value })} onSubcategory={(value) => changeFilters({ subcategory: value })} />
      <div className="catalog-search-row">
        <div className="catalog-search" role="search" aria-label={mn ? "Каталогийн хайлт" : "Search the collection"}>
          <label htmlFor="catalog-search-input">{mn ? "Тодорхой эдлэл хайж байна уу?" : "Looking for something in particular?"}</label>
          <div className="search-field">
            <SearchIcon />
            <input id="catalog-search-input" ref={searchInput} type="search" autoComplete="off" maxLength={240} value={query} onChange={(event) => changeFilters({ query: event.target.value }, true)} placeholder={c.search} />
            {query && <button type="button" className="catalog-search-clear" onClick={clearSearch} aria-label={mn ? "Хайлтын үгийг арилгах" : "Clear search text"}><span aria-hidden="true">×</span></button>}
          </div>
        </div>
        <p className="catalog-search-guidance">{mn ? "Сонирхсон эдлэлээ нээгээд зураг, мэдээллийг үзэж, зөвлөгөө авах боломжтой." : "Open a piece to explore its photographs and details, or ask our team for a closer look."}</p>
      </div>
    </div>
    <div className="catalog-results-heading">
      <div className="catalog-results-title"><h2 id="catalog-results-heading">{subcategoryName || categoryName}</h2><span className="catalog-result-total" role="status" aria-live="polite" aria-atomic="true">{filtered.length} {locale === "en" && filtered.length === 1 ? "piece" : c.results}</span></div>
      {hasFilters && <button type="button" className="catalog-reset" onClick={reset}>{mn ? "Бүх шүүлтийг арилгах" : "Clear all filters"}</button>}
    </div>
    {hasFilters && <div className="catalog-active-filters" role="group" aria-label={mn ? "Сонгосон шүүлтүүд" : "Active filters"}>
      {category !== "all" && <button type="button" onClick={() => changeFilters({ category: "all" })} aria-label={mn ? `${categoryName} ангиллын шүүлтийг арилгах` : `Remove ${categoryName} filter`}>{categoryName}<span aria-hidden="true">×</span></button>}
      {subcategoryName && <button type="button" onClick={() => changeFilters({ subcategory: "all" })} aria-label={mn ? `${subcategoryName} дэд ангиллын шүүлтийг арилгах` : `Remove ${subcategoryName} filter`}>{subcategoryName}<span aria-hidden="true">×</span></button>}
      {query && <button type="button" onClick={clearSearch} aria-label={mn ? `«${query}» хайлтыг арилгах` : `Remove search for ${query}`}><span className="catalog-query-chip">“{query}”</span><span aria-hidden="true">×</span></button>}
    </div>}
    <div role="region" aria-labelledby="catalog-results-heading">
      {filtered.length ? <div className="product-grid">{filtered.map((product, index) => <ProductCard key={product.id} product={product} locale={locale} priority={index < 3} />)}</div> : <div className="empty-state catalog-empty">
        <SearchIcon />
        <h3>{emptyCategory ? (mn ? "Энэ ангилалд одоогоор эдлэл алга." : "No pieces listed in this category yet.") : c.noResults}</h3>
        <p>{emptyCategory ? (mn ? "Одоогоор энэ ангилалд бүртгэл алга. Хайж буй эдлэлийнхээ талаар манай багаас лавлаарай." : "No pieces are listed in this category yet. Ask our team about the piece you have in mind.") : (mn ? "Өөр нэр, кодоор хайх эсвэл шүүлтээ арилгаж дахин үзээрэй. Сонголт хийхэд бид тусалъя." : "Try another name or reference, or remove a filter to broaden your search. We are here to help you choose.")}</p>
        <div className="catalog-empty-actions"><button type="button" className="button button-dark" onClick={query && !emptyCategory ? clearSearch : reset}>{query && !emptyCategory ? c.reset : c.viewAll}<Arrow /></button><Link className="text-link" href={`/${locale}/inquiry`}>{c.enquire}<Arrow diagonal /></Link></div>
      </div>}
    </div>
  </>;
}
