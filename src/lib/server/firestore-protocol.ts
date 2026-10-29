export type DocumentData = Record<string, unknown>;
export type FirestoreDocument = { path: string; data: DocumentData; updateTime?: string };
export type FirestoreWrite = {
  update: { name: string; fields: Record<string, unknown> };
  currentDocument?: { exists: boolean } | { updateTime: string };
};

export class PrivateStoreError extends Error {
  constructor(public code: string = "UNAVAILABLE") {
    super("Private storage request failed.");
    this.name = "PrivateStoreError";
  }
}

export interface FirestoreGateway {
  documentName(path: string): string;
  begin(): Promise<string>;
  readMany(paths: string[], transaction?: string): Promise<Map<string, FirestoreDocument | null>>;
  commit(writes: FirestoreWrite[], transaction?: string): Promise<void>;
  rollback(transaction: string): Promise<void>;
  pipeline(body: unknown): Promise<DocumentData[]>;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PrivateStoreError();
  return value as Record<string, unknown>;
}

export function encodeValue(value: unknown): Record<string, unknown> {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isSafeInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object" && value) return { mapValue: { fields: encodeFields(object(value)) } };
  throw new PrivateStoreError("INVALID_VALUE");
}

export function encodeFields(data: DocumentData): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]));
}

export function decodeValue(input: unknown): unknown {
  const value = object(input);
  if (Object.keys(value).length !== 1) throw new PrivateStoreError();
  if (value.nullValue === null || value.nullValue === "NULL_VALUE") return null;
  if (typeof value.stringValue === "string") return value.stringValue;
  if (typeof value.timestampValue === "string") return value.timestampValue;
  if (typeof value.booleanValue === "boolean") return value.booleanValue;
  if (typeof value.integerValue === "string" && /^-?\d+$/.test(value.integerValue)) {
    const number = Number(value.integerValue);
    if (Number.isSafeInteger(number)) return number;
  }
  if (typeof value.doubleValue === "number" && Number.isFinite(value.doubleValue)) return value.doubleValue;
  if (value.mapValue) return decodeFields(object(value.mapValue).fields ?? {});
  if (value.arrayValue) {
    const values = object(value.arrayValue).values ?? [];
    if (Array.isArray(values)) return values.map(decodeValue);
  }
  throw new PrivateStoreError();
}

export function decodeFields(fields: unknown): DocumentData {
  return Object.fromEntries(Object.entries(object(fields)).map(([key, value]) => [key, decodeValue(value)]));
}

export function documentWrite(
  store: Pick<FirestoreGateway, "documentName">,
  path: string,
  data: DocumentData,
  currentDocument?: FirestoreWrite["currentDocument"],
): FirestoreWrite {
  return {
    update: { name: store.documentName(path), fields: encodeFields(data) },
    ...(currentDocument ? { currentDocument } : {}),
  };
}

/** The caller supplies a scoped identity; this module never accepts a client token. */
export function createFirestoreGateway(options: {
  projectId: string;
  databaseId: string;
  accessToken: () => Promise<string>;
  fetcher?: typeof fetch;
}): FirestoreGateway {
  const database = `projects/${options.projectId}/databases/${options.databaseId}`;
  const prefix = `${database}/documents/`;
  const fetcher = options.fetcher ?? fetch;
  const documentName = (path: string) => {
    if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)+$/.test(path) || path.split("/").length % 2 !== 0) {
      throw new PrivateStoreError("INVALID_PATH");
    }
    return prefix + path;
  };
  async function call(operation: string, body: unknown): Promise<unknown> {
    const response = await fetcher(`https://firestore.googleapis.com/v1/${database}/documents:${operation}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await options.accessToken()}` },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      let code = "UNAVAILABLE";
      try {
        const error = object(object(await response.json()).error);
        if (error.status === "ABORTED" || error.status === "ALREADY_EXISTS") code = "ABORTED";
      } catch { /* Deliberately discard provider payloads and credentials. */ }
      throw new PrivateStoreError(code);
    }
    return response.json();
  }
  return {
    documentName,
    async begin() {
      const result = object(await call("beginTransaction", { options: { readWrite: {} } }));
      if (typeof result.transaction !== "string" || !result.transaction) throw new PrivateStoreError();
      return result.transaction;
    },
    async readMany(paths, transaction) {
      const names = paths.map(documentName);
      const results = await call("batchGet", { documents: names, ...(transaction ? { transaction } : {}) });
      const rows = Array.isArray(results) ? results : [results];
      const documents = new Map<string, FirestoreDocument | null>();
      for (const row of rows) {
        const entry = object(row);
        if (entry.error) throw new PrivateStoreError();
        if (typeof entry.missing === "string" && names.includes(entry.missing)) {
          documents.set(entry.missing.slice(prefix.length), null);
        } else if (entry.found) {
          const found = object(entry.found);
          if (typeof found.name !== "string" || !names.includes(found.name)) throw new PrivateStoreError();
          const path = found.name.slice(prefix.length);
          documents.set(path, { path, data: decodeFields(found.fields ?? {}), updateTime: typeof found.updateTime === "string" ? found.updateTime : undefined });
        }
      }
      if (documents.size !== new Set(paths).size) throw new PrivateStoreError();
      return documents;
    },
    async commit(writes, transaction) {
      const result = object(await call("commit", { writes, ...(transaction ? { transaction } : {}) }));
      if (!Array.isArray(result.writeResults) || result.writeResults.length !== writes.length || typeof result.commitTime !== "string") throw new PrivateStoreError();
    },
    async rollback(transaction) {
      await call("rollback", { transaction });
    },
    async pipeline(body) {
      const input = await call("executePipeline", body);
      const batches = Array.isArray(input) ? input : [input];
      return batches.flatMap((batch) => {
        const row = object(batch);
        if (row.error) throw new PrivateStoreError();
        if (row.results === undefined && (row.executionTime || row.explainStats)) return [];
        if (!Array.isArray(row.results)) throw new PrivateStoreError();
        return row.results.map((result) => decodeFields(object(result).fields));
      });
    },
  };
}
