import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  catalogFilter,
  catalogSelect,
  projectDatabaseCatalog,
  readCatalog,
  publicCatalogProduct,
  CatalogUnavailableError,
} from "../src/lib/server/catalog-reader";

const sample = JSON.parse(readFileSync("data/catalog.json", "utf8"))[0];
function row(overrides: Record<string, unknown> = {}) {
  return {
    code: sample.id,
    slug: sample.slug,
    category: sample.category,
    publication_status: "sample",
    verification_status: "needs_review",
    availability: "unverified",
    price: null,
    currency: "MNT",
    material: null,
    dimensions: null,
    weight: null,
    maker: null,
    period: null,
    image_path: sample.image,
    product_translations: ["mn", "en"].map((locale) => ({
      locale,
      name: sample.name[locale],
      description: sample.description[locale],
      observations: sample.observations[locale],
      publication_status: "draft",
    })),
    ...overrides,
  };
}
const config = {
  source: "supabase",
  includeSamples: "true",
  url: "https://test-project.supabase.co",
  secretKey: "synthetic-test-key",
};

test("file mode remains explicit local default and removes provenance from the public projection", async () => {
  const result = await readCatalog(
    {},
    {
      file: () => [sample],
      query: async () => {
        assert.fail("local mode must not query cloud");
      },
    },
  );
  assert.equal(result[0].id, sample.id);
  for (const field of [
    "sourceUrl",
    "sourceFileName",
    "sourceFolderUrl",
    "needsConfirmation",
  ])
    assert.equal(field in result[0], false);
  assert.equal(JSON.stringify(result).includes("drive.google.com"), false);
});
test("sample reads require the exact opt-in and never include arbitrary drafts or archived records", () => {
  const rows = [
    row(),
    row({ code: "TT-002", slug: "draft", publication_status: "draft" }),
    row({ code: "TT-003", slug: "archived", publication_status: "archived" }),
    row({
      code: "TT-004",
      slug: "wrong-verification",
      verification_status: "verified",
    }),
  ];
  assert.equal(projectDatabaseCatalog(rows, false).length, 0);
  assert.deepEqual(
    projectDatabaseCatalog(rows, true).map((p) => p.id),
    [sample.id],
  );
  assert.equal(catalogFilter(false).includes("sample"), false);
  assert.equal(
    catalogFilter(true).includes("publication_status.eq.draft"),
    false,
  );
});
test("published records need verified status and both published translations", () => {
  const published = row({
    publication_status: "published",
    verification_status: "verified",
  });
  assert.equal(projectDatabaseCatalog([published], true).length, 0);
  published.product_translations = published.product_translations.map((t) => ({
    ...t,
    publication_status: "published",
  }));
  assert.equal(projectDatabaseCatalog([published], false).length, 1);
  assert.equal(
    projectDatabaseCatalog(
      [{ ...published, verification_status: "needs_review" }],
      true,
    ).length,
    0,
  );
});
test("cloud reads use a fixed public select and discard unexpected secret fields", async () => {
  let queried = false;
  const result = await readCatalog(config, {
    file: () => {
      assert.fail("cloud mode must not read file");
    },
    query: async (input) => {
      queried = true;
      assert.equal(input.select, catalogSelect);
      assert.equal(input.select.includes("*"), false);
      assert.equal(input.select.includes("private"), false);
      return [
        row({
          cost: 999,
          internal_notes: "must-not-be-exposed",
          source_url: "private-source",
          secret_key: "private-key",
        }),
      ];
    },
  });
  assert.ok(queried);
  assert.equal(result.length, 1);
  assert.equal(JSON.stringify(result).includes("must-not-be-exposed"), false);
  assert.equal("cost" in result[0], false);
  assert.equal("source_url" in result[0], false);
});
test("missing configuration and cloud failures never silently fall back to local samples", async () => {
  let fileCalls = 0,
    queryCalls = 0;
  const dependencies = {
    file: () => {
      fileCalls++;
      return [publicCatalogProduct(sample)];
    },
    query: async () => {
      queryCalls++;
      throw new Error("provider key=private-value");
    },
  };
  await assert.rejects(
    () => readCatalog({ ...config, secretKey: "" }, dependencies),
    CatalogUnavailableError,
  );
  await assert.rejects(
    () => readCatalog({ ...config, source: "typo" }, dependencies),
    CatalogUnavailableError,
  );
  await assert.rejects(
    () =>
      readCatalog({ ...config, url: "http://insecure.example" }, dependencies),
    CatalogUnavailableError,
  );
  await assert.rejects(
    () => readCatalog(config, dependencies),
    (error) =>
      error instanceof CatalogUnavailableError &&
      !error.message.includes("private-value"),
  );
  assert.equal(fileCalls, 0);
  assert.equal(queryCalls, 1);
});
test("malformed remote content, unsupported image URLs and duplicate identities fail safely", async () => {
  for (const rows of [
    null,
    [row({ image_path: "https://external.example/private.jpg" })],
    [row({ category: "unknown" })],
    [row(), row()],
  ]) {
    await assert.rejects(
      () => readCatalog(config, { file: () => [], query: async () => rows }),
      CatalogUnavailableError,
    );
  }
});
