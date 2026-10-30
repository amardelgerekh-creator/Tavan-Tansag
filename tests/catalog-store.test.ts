import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalogFields, projectDatabaseCatalog, readCatalog, publicCatalogProduct, CatalogUnavailableError } from "../src/lib/server/catalog-reader";
import { catalogPipeline, decodePipelineResponse, fetchFirestoreCatalog } from "../src/lib/server/firestore-catalog";

const source = JSON.parse(readFileSync("data/catalog.json", "utf8"));
const sample = source[0];
const row = (overrides: Record<string, unknown> = {}) => ({ ...sample, visibility: "public", ...overrides });
const config = { source: "firebase", includeSamples: "true", projectId: "test-project", databaseId: "test-database" };
const seed = JSON.parse(readFileSync("firebase/seed.json", "utf8"));
const writes = JSON.parse(readFileSync("firebase/seed-write.json", "utf8")).writes;
const batch = { results: writes.map((write: { update: unknown }) => write.update), executionTime: "2026-10-29T00:00:00Z" };

test("local default removes private provenance from the public projection", async () => {
  const result = await readCatalog({}, { file: () => [sample], query: async () => { assert.fail("no cloud in file mode"); } });
  assert.equal(result[0].id, sample.id);
  for (const field of ["sourceUrl", "sourceFileName", "sourceFolderUrl", "needsConfirmation"])
    assert.equal(field in result[0], false);
  assert.equal(JSON.stringify(result).includes("drive.google.com"), false);
});
test("cloud samples require exact opt-in and never expose private, draft or archived entries", () => {
  const rows = [row(), row({ id: "TT-002", slug: "private", visibility: "private" }), row({ id: "TT-003", slug: "draft", publicationStatus: "draft" }), row({ id: "TT-004", slug: "archived", publicationStatus: "archived" }), row({ id: "TT-005", slug: "wrong-status", verificationStatus: "verified" })];
  assert.equal(projectDatabaseCatalog(rows, false).length, 0);
  assert.deepEqual(projectDatabaseCatalog(rows, true).map((p) => p.id), [sample.id]);
  const published = row({ publicationStatus: "published", verificationStatus: "verified" });
  assert.equal(projectDatabaseCatalog([published], false).length, 1);
  assert.equal(projectDatabaseCatalog([{ ...published, verificationStatus: "needs_review" }], true).length, 0);
});
test("cloud projection strips unexpected private fields and requires both translations", async () => {
  const result = await readCatalog(config, { file: () => { assert.fail("no fallback"); }, query: async () => [row({ cost: 999, internal_notes: "private-value" })] });
  assert.equal(result.length, 1);
  assert.equal("cost" in result[0], false);
  assert.equal(JSON.stringify(result).includes("private-value"), false);
  await assert.rejects(() => readCatalog(config, { file: () => [], query: async () => [row({ name: { mn: "Нэр" } })] }), CatalogUnavailableError);
});
test("cloud config errors and failures never silently fall back or expose provider errors", async () => {
  let fileCalls = 0, queryCalls = 0;
  const dependencies = { file: () => { fileCalls++; return [publicCatalogProduct(sample)]; }, query: async () => { queryCalls++; throw new Error("private-diagnostics"); } };
  for (const invalid of [{ ...config, projectId: "" }, { ...config, databaseId: "" }, { ...config, source: "supabase" }, { ...config, projectId: "../other" }, { ...config, databaseId: "(default)" }])
    await assert.rejects(() => readCatalog(invalid, dependencies), CatalogUnavailableError);
  await assert.rejects(() => readCatalog(config, dependencies), (error) => error instanceof CatalogUnavailableError && !error.message.includes("private-diagnostics"));
  assert.equal(fileCalls, 0);
  assert.equal(queryCalls, 1);
});
test("malformed content, external image URLs and duplicate identities fail safely", async () => {
  for (const rows of [null, [row({ image: "https://external.example/private.jpg" })], [row({ category: "unknown" })], [row(), row()]])
    await assert.rejects(() => readCatalog(config, { file: () => [], query: async () => rows }), CatalogUnavailableError);
});
test("Enterprise pipeline filters before projection and selects public fields only", () => {
  const stages = catalogPipeline(true).structuredPipeline.pipeline.stages;
  assert.deepEqual(stages.map((s) => s.name), ["collection", "where", "sort", "limit", "select"]);
  const filter = JSON.stringify(stages[1]);
  for (const value of ["visibility", "public", "published", "verified", "sample", "needs_review"])
    assert.ok(filter.includes(value));
  assert.equal(JSON.stringify(catalogPipeline(false)).includes('"sample"'), false);
  assert.equal(JSON.stringify(stages).includes("sourceUrl"), false);
  assert.equal(catalogFields.includes("sourceFileName"), false);
});
test("REST read targets named database without privileged credentials and handles batches", async () => {
  const result = await fetchFirestoreCatalog({ projectId: "test-project", databaseId: "named-preview", includeSamples: true }, async (input, init) => {
    assert.equal(input, "https://firestore.googleapis.com/v1/projects/test-project/databases/named-preview/documents:executePipeline");
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.method, "POST");
    return new Response(JSON.stringify([batch, { executionTime: batch.executionTime }]), { status: 200 });
  });
  assert.equal(result.length, seed.length);
  assert.deepEqual(projectDatabaseCatalog(result, true), seed.map(publicCatalogProduct));
  assert.deepEqual(decodePipelineResponse({ executionTime: batch.executionTime }), []);
  assert.throws(() => decodePipelineResponse([{ error: { message: "private" } }]), CatalogUnavailableError);
  assert.throws(() => decodePipelineResponse({}), CatalogUnavailableError);
  await assert.rejects(() => fetchFirestoreCatalog({ projectId: "test-project", databaseId: "named-preview", includeSamples: true }, async () => new Response("denied", { status: 403 })), CatalogUnavailableError);
});
test("Firebase upload contains bounded public samples matching the source, no provenance, and refuses overwrite", () => {
  assert.ok(seed.length >= 1 && seed.length <= 100);
  assert.equal(seed.length, source.length);
  assert.equal(writes.length, seed.length);
  assert.deepEqual(seed.map((entry: { id: string }) => entry.id), source.map((entry: { id: string }) => entry.id));
  for (const [i, product] of seed.entries()) {
    assert.equal(product.visibility, "public");
    assert.equal(product.publicationStatus, "sample");
    assert.equal(product.verificationStatus, "needs_review");
    // Old seed files omit newly introduced public fields; new exports may carry them.
    for (const field of Object.keys(product)) assert.ok(catalogFields.includes(field), `Unexpected public field: ${field}`);
    for (const field of catalogFields.filter((field) => !["condition", "priceMode", "subcategory"].includes(field))) assert.ok(field in product, `Missing required public field: ${field}`);
    assert.equal(writes[i].currentDocument.exists, false);
    assert.equal(writes[i].update.name, `projects/tavan-tansag-30560/databases/tavan-tansag-preview/documents/catalog_public/${product.id}`);
  }
  assert.equal(JSON.stringify(writes).includes("drive.google.com"), false);
  assert.equal(JSON.stringify(writes).includes("needsConfirmation"), false);
});
