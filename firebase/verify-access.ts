import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { catalogFields, publicCatalogProduct, readCatalog } from "../src/lib/server/catalog-reader";
import { fetchFirestoreCatalog } from "../src/lib/server/firestore-catalog";

// Defaults to read-only. --probe-writes explicitly attempts two disposable
// creates; it never updates/deletes any existing product or customer document.
const projectId = "tavan-tansag-30560";
const databaseId = "tavan-tansag-preview";
const resource = `projects/${projectId}/databases/${databaseId}/documents`;
const base = `https://firestore.googleapis.com/v1/${resource}`;
type Json = Record<string, unknown>;
const asObject = (value: unknown): Json =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};

function responseObject(value: unknown): Json {
  if (!Array.isArray(value)) return asObject(value);
  // executePipeline streams errors as a one-element JSON array. Accept only a
  // single, error-only frame; mixed success/error streams must still fail.
  if (value.length !== 1) return {};
  const frame = asObject(value[0]);
  const error = asObject(frame.error);
  return Object.keys(frame).length === 1
    && typeof error.code === "number"
    && typeof error.status === "string"
    && typeof error.message === "string"
    ? frame : {};
}

export async function verifyAccess(
  probeWrites = false,
  fetcher: typeof fetch = fetch,
  log: (message: string) => void = console.log,
) {
  // Deliberately fixed to the preview database; no ADC, tokens or auth headers.
  const anonymousFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.has("Authorization"), false);
    return fetcher(input, { ...init, headers, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000) });
  };
  const request = async (url: string, init?: RequestInit) => {
    const response = await anonymousFetch(url, init);
    const body: unknown = await response.json().catch(() => null);
    return { status: response.status, body: responseObject(body) };
  };
  const jsonPost = (body: unknown): RequestInit => ({
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const requireDenied = (label: string, result: { status: number; body: Json }) => {
    assert.equal(result.status, 403, `${label}: expected HTTP 403, received ${result.status}`);
    assert.equal(asObject(result.body.error).status, "PERMISSION_DENIED", `${label}: not a Firestore permission denial`);
    log(`PASS denied: ${label}`);
  };

  // Positive controls first: a broken endpoint or deny-all rules must not pass.
  const seed: Json[] = JSON.parse(readFileSync("firebase/seed.json", "utf8"));
  const config = { source: "firebase", includeSamples: "true", projectId, databaseId };
  const dependencies = {
    file: () => { throw new Error("No local fallback during live verification."); },
    query: (input: Parameters<typeof fetchFirestoreCatalog>[0]) => fetchFirestoreCatalog(input, anonymousFetch),
  };
  const samples = await readCatalog(config, dependencies);
  assert.deepEqual(samples, seed.map(publicCatalogProduct), "Live public records differ from the sanitized seed");
  assert.deepEqual(await readCatalog({ ...config, includeSamples: "false" }, dependencies), []);
  log("PASS public pipelines: ten exact sanitized samples; zero published records");

  // Direct document access has no projection: inspect actual stored field keys.
  for (const entry of seed) {
    const result = await request(`${base}/catalog_public/${entry.id}`);
    assert.equal(result.status, 200, `Public document ${entry.id} is unavailable`);
    assert.deepEqual(Object.keys(asObject(result.body.fields)).sort(), [...catalogFields].sort(), `Unexpected public document fields: ${entry.id}`);
  }
  log("PASS public document reads: all ten contain only allowlisted fields");

  const pipeline = (collection: string, condition?: Json) => ({
    structuredPipeline: { pipeline: { stages: [
      { name: "collection", args: [{ referenceValue: `/${collection}` }] },
      ...(condition ? [{ name: "where", args: [condition] }] : []),
    ] } },
  });
  const equal = (field: string, value: string): Json => ({
    functionValue: { name: "equal", args: [{ fieldReferenceValue: field }, { stringValue: value }] },
  });
  const incomplete = pipeline("catalog_public", equal("visibility", "public"));
  const forged = pipeline("catalog_public", {
    functionValue: { name: "and", args: [equal("visibility", "public"), equal("publicationStatus", "draft")] },
  });
  for (const [label, body] of [
    ["catalog query without filters", pipeline("catalog_public")],
    ["catalog query without status constraints", incomplete],
    ["draft catalog query", forged],
    ["private inquiries collection", pipeline("inquiries")],
    ["private customer collection", pipeline("customers")],
    ["nested private catalog collection", pipeline("catalog_public/TT-001/private")],
  ] as const) {
    requireDenied(label, await request(`${base}:executePipeline`, jsonPost(body)));
  }
  for (const path of ["inquiries/access-verification", "customers/access-verification", "catalog_public/TT-001/private/provenance"]) {
    requireDenied(`private document ${path}`, await request(`${base}/${path}`));
  }
  if (!probeWrites) {
    log("Read verification complete. Write probes skipped; use --probe-writes to test denied anonymous creates.");
    return;
  }

  const sourceWrite = JSON.parse(readFileSync("firebase/seed-write.json", "utf8")).writes[0].update;
  for (const collection of ["catalog_public", "inquiries"]) {
    const id = `access-probe-${randomUUID()}`;
    const path = `${resource}/${collection}/${id}`;
    const url = `${base}/${collection}/${id}`;
    const fields = collection === "catalog_public" ? {
      ...sourceWrite.fields,
      id: { stringValue: "TT-999999" },
      slug: { stringValue: id },
      name: { mapValue: { fields: { mn: { stringValue: "Эрхийн шалгалт" }, en: { stringValue: "Access verification probe" } } } },
    } : { purpose: { stringValue: "anonymous-access-verification" }, synthetic: { booleanValue: true } };
    log(`PROBE create-only: ${path}`);
    let result: { status: number; body: Json };
    try {
      result = await request(`${base}/${collection}?documentId=${encodeURIComponent(id)}`, jsonPost({ fields }));
    } catch {
      throw new Error(`Create outcome unknown; administrator must inspect/remove only this probe if present: ${path}`);
    }
    if (result.status === 403 && asObject(result.body.error).status === "PERMISSION_DENIED") {
      requireDenied(`anonymous create in ${collection}`, result);
      continue;
    }
    if (result.status >= 200 && result.status < 300) {
      // On a rule regression, remove only the exact newly created version. Never
      // remove an existing record or a probe another actor has since modified.
      let cleaned = false;
      if (result.body.name === path && typeof result.body.updateTime === "string") {
        try {
          const cleanup = await request(`${url}?currentDocument.updateTime=${encodeURIComponent(result.body.updateTime)}`, { method: "DELETE" });
          cleaned = cleanup.status >= 200 && cleanup.status < 300;
        } catch { /* Report the exact cleanup target below. */ }
      }
      throw new Error(`SECURITY FAILURE: anonymous create accepted in ${collection}. ${cleaned ? "Exact disposable probe was removed." : `Administrator cleanup required: ${path}`}`);
    }
    throw new Error(`Anonymous create returned unexpected HTTP ${result.status}; test is inconclusive. Administrator should check this probe path if needed: ${path}`);
  }
  log("PASS anonymous creates denied in public catalog and private inquiries; no probe documents created");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("node --import tsx firebase/verify-access.ts [--probe-writes]\nDefault: read-only. --probe-writes: attempt disposable creates and clean up only an unexpectedly created probe.");
    return;
  }
  assert.ok(args.every((arg) => arg === "--probe-writes"), "Unknown argument");
  await verifyAccess(args.includes("--probe-writes"));
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/verify-access.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Access verification failed");
    process.exitCode = 1;
  });
}
