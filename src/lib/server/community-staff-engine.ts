import { z } from "zod";
import { communityIdSchema, communityPatchSchema, communityRecordSchema, communityStatuses, type CommunityPatch, type CommunityPage, type CommunityRecord, type CommunityStatus } from "../community-contract";
import { documentWrite, PrivateStoreError, type FirestoreGateway, type DocumentData } from "./firestore-protocol";

export class CommunityError extends Error {
  constructor(public code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "UNAVAILABLE") { super("The community request could not be completed."); }
}
export type CommunityActor = { uid: string; email: string };
export type CommunityListOptions = { status?: CommunityStatus; before?: string; limit?: number };
const cursorSchema = z.object({ createdAt: z.iso.datetime(), id: communityIdSchema }).strict();
const field = (name: string) => ({ fieldReferenceValue: name });
const string = (value: string) => ({ stringValue: value });
const fn = (name: string, ...args: unknown[]) => ({ functionValue: { name, args } });
const eq = (name: string, value: string) => fn("equal", field(name), string(value));
const sort = (name: string) => ({ mapValue: { fields: { expression: field(name), direction: string("descending") } } });

export function communityListPipeline(options: CommunityListOptions = {}) {
  const parsed = z.object({ status: z.enum(communityStatuses).optional(), before: z.string().min(1).max(512).optional(), limit: z.number().int().min(1).max(30).optional() }).strict().safeParse(options);
  if (!parsed.success) throw new CommunityError("INVALID_INPUT");
  const limit = parsed.data.limit ?? 30;
  let cursor: z.infer<typeof cursorSchema> | undefined;
  if (parsed.data.before) {
    try {
      if (!/^[A-Za-z0-9_-]+$/.test(parsed.data.before)) throw new Error();
      const bytes = Buffer.from(parsed.data.before, "base64url");
      if (bytes.toString("base64url") !== parsed.data.before) throw new Error();
      cursor = cursorSchema.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
    } catch { throw new CommunityError("INVALID_INPUT"); }
  }
  const filters: unknown[] = [];
  if (parsed.data.status) filters.push(eq("status", parsed.data.status));
  if (cursor) filters.push(fn("or",
    fn("less_than", field("createdAt"), string(cursor.createdAt)),
    fn("and", eq("createdAt", cursor.createdAt), fn("less_than", field("id"), string(cursor.id))),
  ));
  const stages: unknown[] = [{ name: "collection", args: [{ referenceValue: "/community_requests" }] }];
  if (filters.length) stages.push({ name: "where", args: [filters.length === 1 ? filters[0] : fn("and", ...filters)] });
  stages.push(
    { name: "sort", args: [sort("createdAt"), sort("id")] },
    { name: "limit", args: [{ integerValue: String(limit + 1) }] },
    { name: "select", args: [{ mapValue: { fields: Object.fromEntries(Object.keys(communityRecordSchema.shape).map(name => [name, field(name)])) } }] },
  );
  return { body: { structuredPipeline: { pipeline: { stages } } }, limit };
}
function decodeRecord(data: DocumentData): CommunityRecord {
  const parsed = communityRecordSchema.safeParse(data);
  if (!parsed.success) throw new CommunityError("UNAVAILABLE");
  return parsed.data;
}

/** Routes authenticate Firebase staff tokens first; the engine also enforces the explicit staff allowlist. */
export function createCommunityStaffStore(options: { store: FirestoreGateway; allowedEmails: string[]; now?: () => number }) {
  const { store } = options;
  const allowed = options.allowedEmails.map(value => value.trim().toLowerCase()).filter(Boolean);
  function checkActor(actor: CommunityActor) {
    if (!actor || typeof actor.uid !== "string" || !actor.uid || actor.uid.length > 128 || typeof actor.email !== "string" || !allowed.includes(actor.email.toLowerCase())) throw new CommunityError("INVALID_INPUT");
  }
  return {
    async list(input: CommunityListOptions, actor: CommunityActor): Promise<CommunityPage> {
      checkActor(actor);
      const { body, limit } = communityListPipeline(input);
      try {
        const rows = await store.pipeline(body);
        if (rows.length > limit + 1) throw new CommunityError("UNAVAILABLE");
        const items = rows.slice(0, limit).map(decodeRecord), hasMore = rows.length > limit;
        const last = items.at(-1);
        return { items, hasMore, nextCursor: hasMore && last ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id })).toString("base64url") : null };
      } catch (error) { if (error instanceof CommunityError) throw error; throw new CommunityError("UNAVAILABLE"); }
    },
    async update(id: string, raw: CommunityPatch, actor: CommunityActor): Promise<CommunityRecord> {
      checkActor(actor);
      const patch = communityPatchSchema.safeParse(raw);
      if (!patch.success || !communityIdSchema.safeParse(id).success) throw new CommunityError("INVALID_INPUT");
      const path = `community_requests/${id}`;
      for (let attempt = 0; attempt < 4; attempt++) {
        let transaction: string | undefined; let committed = false;
        try {
          transaction = await store.begin();
          const document = (await store.readMany([path], transaction)).get(path);
          if (!document) throw new CommunityError("NOT_FOUND");
          const current = decodeRecord(document.data);
          if (current.id !== id) throw new CommunityError("UNAVAILABLE");
          if (current.revision !== patch.data.revision) throw new CommunityError("CONFLICT");
          if (current.status === patch.data.status) return current;
          if (current.status === "withdrawn") throw new CommunityError("INVALID_INPUT");
          const at = new Date(options.now?.() ?? Date.now()).toISOString();
          const next = { ...current, status: patch.data.status, revision: current.revision + 1, updatedAt: at };
          await store.commit([
            documentWrite(store, path, next, { exists: true }),
            documentWrite(store, `${path}/activity/revision-${next.revision}`, {
              kind: "status_changed", at, actorUid: actor.uid, actorEmail: actor.email.toLowerCase(),
              previousStatus: current.status, status: next.status, revision: next.revision,
            }, { exists: false }),
          ], transaction);
          committed = true; return next;
        } catch (error) {
          if (error instanceof CommunityError) throw error;
          if (!(error instanceof PrivateStoreError) || error.code !== "ABORTED" || attempt === 3) throw new CommunityError("UNAVAILABLE");
        } finally { if (transaction && !committed) await store.rollback(transaction).catch(() => undefined); }
      }
      throw new CommunityError("UNAVAILABLE");
    },
  };
}
