import { readFile, writeFile } from "node:fs/promises";

// This creates a reviewable local seed. It does not connect to or mutate a database.
const root = new URL("../", import.meta.url);
const catalog = JSON.parse(
  await readFile(new URL("data/catalog.json", root), "utf8"),
);
if (!Array.isArray(catalog) || !catalog.length)
  throw new Error("Expected a non-empty data/catalog.json array.");
const literal = (value) =>
  value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const categories = new Set([
  "saddles",
  "vessels",
  "accessories",
  "jewelry",
  "objects",
]);
const identifiers = new Set();
const statements = [
  "-- Generated from data/catalog.json. Source metadata is private; every record remains a sample.",
  "-- Existing catalog records are never overwritten. Review and publish separately.",
  "begin;",
  "set local standard_conforming_strings = on;",
];

for (const item of catalog) {
  if (!/^TT-\d{3,6}$/.test(item.id) || identifiers.has(item.id))
    throw new Error(`Invalid or duplicate code: ${item.id}`);
  identifiers.add(item.id);
  if (!categories.has(item.category))
    throw new Error(`Unknown category for ${item.id}`);
  if (typeof item.slug !== "string" || !/^[a-z0-9-]+$/.test(item.slug))
    throw new Error(`Invalid slug for ${item.id}`);
  for (const language of ["mn", "en"]) {
    if (!item.name?.[language] || !item.description?.[language])
      throw new Error(`Missing ${language} translation for ${item.id}`);
  }
  // These are discovery records, not verified stock. Never import inferred pricing/material/age.
  statements.push(`
insert into public.products (code, slug, category, publication_status, verification_status, availability, currency, image_path)
values (${literal(item.id)}, ${literal(item.slug)}, ${literal(item.category)}, 'sample', 'needs_review', 'unverified', 'MNT', ${literal(item.image)})
on conflict (code) do nothing;`);
  for (const language of ["mn", "en"]) {
    statements.push(`
insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, ${literal(language)}, ${literal(item.name[language])}, ${literal(item.description[language])}, ${literal(item.observations?.[language])}, 'draft'
from public.products where code = ${literal(item.id)} and publication_status = 'sample'
on conflict (product_id, locale) do nothing;`);
  }
  statements.push(`
insert into private.product_details (product_id, source_file_name, source_url, source_folder_url, needs_confirmation)
select id, ${literal(item.sourceFileName)}, ${literal(item.sourceUrl)}, ${literal(item.sourceFolderUrl)}, ${literal(JSON.stringify(item.needsConfirmation ?? []))}::jsonb
from public.products where code = ${literal(item.id)} and publication_status = 'sample'
on conflict (product_id) do nothing;`);
}
statements.push("\ncommit;\n");
await writeFile(
  new URL("supabase/seed.sql", root),
  statements.join("\n"),
  "utf8",
);
console.log(
  `Prepared ${catalog.length} sample records in supabase/seed.sql. No database was changed.`,
);
