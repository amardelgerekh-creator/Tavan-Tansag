import "server-only";
import { z } from "zod";
import { crmPatchSchema, crmStatuses, inquiryRecordSchema, type CrmPatch, type InquiryPage, type InquiryRecord, type CrmStatus } from "../crm-contract";
import { privateFirestore } from "./firestore-private";
import { documentWrite, PrivateStoreError, type DocumentData } from "./firestore-protocol";

export { crmStatuses, crmPatchSchema } from "../crm-contract";
export type { CrmStatus, CrmPatch, InquiryRecord, InquiryPage } from "../crm-contract";

export class CrmError extends Error {
  constructor(public code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "UNAVAILABLE") {
    super("The CRM request could not be completed.");
    this.name = "CrmError";
  }
}

const referenceSchema = z.string().regex(/^TT-[A-F0-9]{20}$/);
const cursorSchema = z.object({ createdAt: z.iso.datetime(), reference: referenceSchema }).strict();
const field = (name: string) => ({ fieldReferenceValue: name });
const string = (value: string) => ({ stringValue: value });
const fn = (name: string, ...args: unknown[]) => ({ functionValue: { name, args } });
const eq = (name: string, value: string) => fn("equal", field(name), string(value));
const sort = (name: string) => ({ mapValue: { fields: { expression: field(name), direction: string("descending") } } });

function decodeRecord(data: DocumentData): InquiryRecord {
  const parsed = inquiryRecordSchema.safeParse(data);
  if (!parsed.success) throw new CrmError("UNAVAILABLE");
  return parsed.data;
}

/** Call only after the route has verified staff identity. Never expose this via a public route. */
export async function listInquiries(options: { status?: CrmStatus; limit?: number; before?: string } = {}): Promise<InquiryPage> {
  const parsed = z.object({ status: z.enum(crmStatuses).optional(), limit: z.number().int().min(1).max(100).optional(), before: z.string().max(512).optional() }).strict().safeParse(options);
  if (!parsed.success) throw new CrmError("INVALID_INPUT");
  const limit = parsed.data.limit ?? 50;
  let cursor: z.infer<typeof cursorSchema> | undefined;
  if (parsed.data.before) {
    try { cursor = cursorSchema.parse(JSON.parse(Buffer.from(parsed.data.before, "base64url").toString("utf8"))); }
    catch { throw new CrmError("INVALID_INPUT"); }
  }
  const filters = [];
  if (parsed.data.status) filters.push(eq("status", parsed.data.status));
  if (cursor) filters.push(fn("or",
    fn("less_than", field("createdAt"), string(cursor.createdAt)),
    fn("and", eq("createdAt", cursor.createdAt), fn("less_than", field("reference"), string(cursor.reference))),
  ));
  const stages: unknown[] = [{ name: "collection", args: [{ referenceValue: "/inquiries" }] }];
  if (filters.length) stages.push({ name: "where", args: [filters.length === 1 ? filters[0] : fn("and", ...filters)] });
  stages.push({ name: "sort", args: [sort("createdAt"), sort("reference")] }, { name: "limit", args: [{ integerValue: String(limit + 1) }] });
  try {
    const rows = await privateFirestore().pipeline({ structuredPipeline: { pipeline: { stages } } });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(decodeRecord);
    const last = items.at(-1);
    return { items, hasMore, nextCursor: hasMore && last ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, reference: last.reference })).toString("base64url") : null };
  } catch (error) {
    if (error instanceof CrmError) throw error;
    throw new CrmError("UNAVAILABLE");
  }
}

/** Staff-authorized caller only. Customer contact strings never grant access. */
export async function getInquiry(reference: string): Promise<InquiryRecord | null> {
  if (!referenceSchema.safeParse(reference).success) throw new CrmError("INVALID_INPUT");
  try {
    const path = `inquiries/${reference}`;
    const record = (await privateFirestore().readMany([path])).get(path);
    return record ? decodeRecord(record.data) : null;
  } catch (error) {
    if (error instanceof CrmError) throw error;
    throw new CrmError("UNAVAILABLE");
  }
}

/** Immutable customer fields, optimistic revision check, and audit event in one transaction. */
export async function updateInquiry(reference: string, input: CrmPatch, actor: { uid: string; email: string }): Promise<InquiryRecord> {
  const patch = crmPatchSchema.safeParse(input);
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!referenceSchema.safeParse(reference).success || !patch.success || !actor.uid || actor.uid.length > 128 || !staff.includes(actor.email.toLowerCase()) || !staff.includes(patch.data.assignee.toLowerCase())) throw new CrmError("INVALID_INPUT");
  let store;
  try { store = privateFirestore(); } catch { throw new CrmError("UNAVAILABLE"); }
  const path = `inquiries/${reference}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    let transaction: string | undefined;
    let committed = false;
    try {
      transaction = await store.begin();
      const record = (await store.readMany([path], transaction)).get(path);
      if (!record) throw new CrmError("NOT_FOUND");
      const current = decodeRecord(record.data);
      if (current.revision !== patch.data.revision) throw new CrmError("CONFLICT");
      const at = new Date().toISOString();
      const next = { ...current, ...patch.data, assignee: patch.data.assignee.toLowerCase(), revision: current.revision + 1, updatedAt: at };
      await store.commit([
        documentWrite(store, path, next, { exists: true }),
        documentWrite(store, `${path}/activity/revision-${next.revision}`, {
          kind: "updated", at, actorUid: actor.uid, actorEmail: actor.email.toLowerCase(), revision: next.revision,
          previousStatus: current.status, status: next.status, assignee: next.assignee,
          followUpAt: next.followUpAt, notes: next.notes,
        }, { exists: false }),
      ], transaction);
      committed = true;
      return next;
    } catch (error) {
      if (error instanceof CrmError) throw error;
      if (!(error instanceof PrivateStoreError) || error.code !== "ABORTED" || attempt === 3) throw new CrmError("UNAVAILABLE");
    } finally {
      if (transaction && !committed) await store.rollback(transaction).catch(() => undefined);
    }
  }
  throw new CrmError("UNAVAILABLE");
}
