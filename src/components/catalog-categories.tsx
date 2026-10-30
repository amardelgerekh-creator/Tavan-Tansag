"use client";

import { categories, categoryIds, subcategories, type Category, type Locale, type Product } from "@/lib/catalog";

export function CatalogCategories({ products, locale, category, subcategory, onCategory, onSubcategory }: {
  products: Product[]; locale: Locale; category: Category | "all"; subcategory: string;
  onCategory: (category: Category | "all") => void; onSubcategory: (subcategory: string) => void;
}) {
  const mn = locale === "mn";
  const mainCount = (key: Category) => products.filter((piece) => piece.category === key).length;
  const children = category === "all" ? [] : Object.entries(subcategories[category]);
  return <div className="catalog-taxonomy">
    <div className="catalog-taxonomy-heading"><span className="eyebrow">{mn ? "ЭДЛЭЛИЙН АНГИЛАЛ" : "BROWSE BY CATEGORY"}</span><button type="button" className="catalog-all" aria-pressed={category === "all"} onClick={() => onCategory("all")}>{mn ? "Бүх эдлэл" : "All pieces"} <span>{products.length}</span></button></div>
    <div className="catalog-main-categories" role="group" aria-label={mn ? "Үндсэн ангилал" : "Main categories"}>
      {categoryIds.map((key) => <button type="button" key={key} aria-pressed={category === key} onClick={() => onCategory(key)}><span>{categories[key][locale]}</span><span className="catalog-category-count" aria-label={mn ? `${mainCount(key)} бүртгэл` : `${mainCount(key)} records`}>{mainCount(key)}</span></button>)}
    </div>
    {category !== "all" && <div className="catalog-subcategories" role="group" aria-label={mn ? `${categories[category].mn}: дэд ангилал` : `${categories[category].en}: subcategories`}>
      <button type="button" aria-pressed={subcategory === "all"} onClick={() => onSubcategory("all")}>{mn ? "Бүгд" : "All"} <span>{mainCount(category)}</span></button>
      {children.map(([key, label]) => {
        const count = products.filter((piece) => piece.category === category && piece.subcategory === key).length;
        return <button type="button" key={key} aria-pressed={subcategory === key} onClick={() => onSubcategory(key)}>{label[locale]} <span aria-label={mn ? `${count} бүртгэл` : `${count} records`}>{count}</span></button>;
      })}
    </div>}
    <p className="catalog-taxonomy-help">{mn ? "Тоонууд нь каталогт бүртгэлтэй эдлэлийг илэрхийлнэ. Бэлэн байдлыг зөвлөх баталгаажуулна." : "Counts show catalog records. Our team confirms availability."}</p>
    {category === "silverware" && <p className="catalog-material-note">{mn ? "«Мөнгөн эдлэл» нь каталогийн ангиллын нэр. Жишиг зурагт буй эдлэлийн материал, мөнгөний сорьцыг баталгаажуулсан утга агуулахгүй; эдлэл бүрийн мэдээллийг зөвлөхөөс тодруулна уу." : "Silverware is a catalog category, not confirmation of the material or silver purity of sample pieces. Ask our team to verify each piece."}</p>}
  </div>;
}
