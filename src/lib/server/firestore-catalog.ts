import { catalogCollection, catalogFields, CatalogUnavailableError } from "./catalog-reader";

type Value = Record<string, unknown>;
const field = (name: string): Value => ({ fieldReferenceValue: name });
const string = (value: string): Value => ({ stringValue: value });
const fn = (name: string, ...args: Value[]): Value => ({ functionValue: { name, args } });
const eq = (name: string, value: string) => fn("equal", field(name), string(value));

// REST wire format verified against Firebase's official pipeline/stage serializer.
// Filter before select: Rules constrain stored fields, not derived values.
export function catalogPipeline(includeSamples: boolean) {
  const published = fn("and", eq("publicationStatus", "published"), eq("verificationStatus", "verified"));
  const status = includeSamples
    ? fn("or", published, fn("and", eq("publicationStatus", "sample"), eq("verificationStatus", "needs_review")))
    : published;
  return {
    structuredPipeline: {
      pipeline: {
        stages: [
          { name: "collection", args: [{ referenceValue: `/${catalogCollection}` }] },
          { name: "where", args: [fn("and", eq("visibility", "public"), status)] },
          { name: "sort", args: [{ mapValue: { fields: { direction: string("ascending"), expression: field("id") } } }] },
          { name: "limit", args: [{ integerValue: "1000" }] },
          { name: "select", args: [{ mapValue: { fields: Object.fromEntries(catalogFields.map((name) => [name, field(name)])) } }] },
        ],
      },
    },
  };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CatalogUnavailableError();
  return value as Record<string, unknown>;
}

export function decodeFirestoreValue(input: unknown): unknown {
  const value = record(input);
  if (Object.keys(value).length !== 1) throw new CatalogUnavailableError();
  if (value.nullValue === null) return null;
  if (typeof value.stringValue === "string") return value.stringValue;
  if (typeof value.booleanValue === "boolean") return value.booleanValue;
  if (typeof value.integerValue === "string" && /^-?\d+$/.test(value.integerValue)) {
    const number = Number(value.integerValue);
    if (Number.isSafeInteger(number)) return number;
  }
  if (typeof value.doubleValue === "number" && Number.isFinite(value.doubleValue)) return value.doubleValue;
  if (value.mapValue) {
    const fields = record(record(value.mapValue).fields ?? {});
    return Object.fromEntries(Object.entries(fields).map(([key, v]) => [key, decodeFirestoreValue(v)]));
  }
  throw new CatalogUnavailableError();
}

export function decodePipelineResponse(input: unknown): unknown[] {
  const batches = Array.isArray(input) ? input : [input];
  if (batches.length === 0) throw new CatalogUnavailableError();
  return batches.flatMap((input) => {
    const batch = record(input);
    if (batch.error) throw new CatalogUnavailableError();
    if (batch.results === undefined) {
      if (typeof batch.executionTime === "string" || batch.explainStats) return [];
      throw new CatalogUnavailableError();
    }
    if (!Array.isArray(batch.results)) throw new CatalogUnavailableError();
    return batch.results.map((result) => {
      const fields = record(record(result).fields);
      return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]));
    });
  });
}

export async function fetchFirestoreCatalog(
  config: { projectId: string; databaseId: string; includeSamples: boolean },
  fetcher: typeof fetch = fetch,
): Promise<unknown[]> {
  // No Authorization header: unauthenticated REST is subject to Firestore Rules.
  // Never use an Admin credential that bypasses those rules for public rendering.
  const path = `projects/${encodeURIComponent(config.projectId)}/databases/${encodeURIComponent(config.databaseId)}`;
  const response = await fetcher(`https://firestore.googleapis.com/v1/${path}/documents:executePipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(catalogPipeline(config.includeSamples)),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new CatalogUnavailableError();
  return decodePipelineResponse(await response.json());
}
