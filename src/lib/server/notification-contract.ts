import { z } from "zod";

export const notificationRecipient = "amardelgerekh@gmail.com" as const;
export const notificationCollection = "notification_outbox";
export const notificationIdSchema = z.string().regex(/^(?:inquiry-TT-[A-F0-9]{20}|community-CM-[a-f0-9]{64})$/);
const timestamp = z.string().datetime();
export const notificationFromSchema = z.string().trim().min(3).max(200).refine(value => {
  if (/[\r\n]/.test(value)) return false;
  const address = /^(?:[^<>]+<([^<>]+)>|([^<>]+))$/.exec(value);
  return Boolean(address && z.email().safeParse((address[1] ?? address[2]).trim()).success);
});
const envelopeSchema = z.object({
  from: notificationFromSchema,
  to: z.literal(notificationRecipient),
  subject: z.string().max(180),
  text: z.string().max(1500),
}).strict();
export const notificationErrors = ["transport_uncertain", "provider_retryable", "provider_rejected", "provider_conflict", "retry_window_expired", "attempt_limit"] as const;
export const notificationRecordSchema = z.object({
  id: notificationIdSchema,
  kind: z.enum(["inquiry", "community"]),
  sourceId: z.string().max(80),
  productId: z.string().regex(/^TT-\d{3,6}$/).nullable(),
  locale: z.enum(["mn", "en"]),
  createdAt: timestamp,
  updatedAt: timestamp,
  status: z.enum(["pending", "sending", "accepted", "failed", "review"]),
  attemptCount: z.number().int().min(0).max(12),
  nextAttemptAt: timestamp.nullable(),
  firstAttemptAt: timestamp.nullable(),
  leaseUntil: timestamp.nullable(),
  leaseToken: z.string().uuid().nullable(),
  envelope: envelopeSchema.nullable(),
  providerId: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/).nullable(),
  acceptedAt: timestamp.nullable(),
  lastError: z.enum(notificationErrors).nullable(),
}).strict().superRefine((row, ctx) => {
  const validSource = row.kind === "inquiry" ? /^TT-[A-F0-9]{20}$/.test(row.sourceId) : /^CM-[a-f0-9]{64}$/.test(row.sourceId);
  if (!validSource || row.id !== `${row.kind}-${row.sourceId}` || (row.kind === "community" && row.productId !== null)) ctx.addIssue({ code: "custom", message: "Invalid source identity" });
  if (row.attemptCount === 0 && (row.firstAttemptAt !== null || row.envelope !== null)) ctx.addIssue({ code: "custom", message: "Unattempted notification cannot have a provider payload" });
  if (row.attemptCount > 0 && (!row.firstAttemptAt || !row.envelope)) ctx.addIssue({ code: "custom", message: "Attempted notification requires its immutable payload" });
  if (row.status === "sending" && (!row.leaseToken || !row.leaseUntil || row.nextAttemptAt !== row.leaseUntil)) ctx.addIssue({ code: "custom", message: "Sending requires a lease" });
  if (row.status !== "sending" && (row.leaseToken || row.leaseUntil)) ctx.addIssue({ code: "custom", message: "Inactive notification cannot retain a lease" });
  if ((row.status === "accepted" || row.status === "review") !== (row.nextAttemptAt === null)) ctx.addIssue({ code: "custom", message: "Only terminal states have no next attempt" });
  if (row.status === "accepted" && (!row.providerId || !row.acceptedAt)) ctx.addIssue({ code: "custom", message: "Provider acceptance requires evidence" });
  if (row.status !== "accepted" && (row.providerId || row.acceptedAt)) ctx.addIssue({ code: "custom", message: "Provider evidence requires acceptance" });
});
export type NotificationRecord = z.infer<typeof notificationRecordSchema>;
export type NotificationEnvelope = z.infer<typeof envelopeSchema>;
export type NotificationResult = { status: "accepted" | "done" | "disabled" | "review" } | { status: "retry"; retryAfterSeconds: number };

export function notificationPath(id: string) {
  return `${notificationCollection}/${notificationIdSchema.parse(id)}`;
}

export function createNotificationRecord(input: { kind: "inquiry" | "community"; sourceId: string; productId: string | null; locale: "mn" | "en" }, now = Date.now()): NotificationRecord {
  const at = new Date(now).toISOString();
  return notificationRecordSchema.parse({
    ...input, id: `${input.kind}-${input.sourceId}`, createdAt: at, updatedAt: at,
    status: "pending", attemptCount: 0, nextAttemptAt: at, firstAttemptAt: null,
    leaseUntil: null, leaseToken: null, envelope: null, providerId: null, acceptedAt: null, lastError: null,
  });
}

export const notificationForInquiry = (reference: string, productId: string | null, locale: "mn" | "en", now = Date.now()) => createNotificationRecord({ kind: "inquiry", sourceId: reference, productId, locale }, now);
export const notificationForCommunity = (id: string, locale: "mn" | "en", now = Date.now()) => createNotificationRecord({ kind: "community", sourceId: id, productId: null, locale }, now);

/** Contains only system-generated references and labels, never customer text or contact details. */
export function notificationEnvelope(row: Pick<NotificationRecord, "kind" | "sourceId" | "productId" | "locale" | "createdAt">, from: string): NotificationEnvelope {
  const inquiry = row.kind === "inquiry";
  return {
    from: notificationFromSchema.parse(from), to: notificationRecipient,
    subject: inquiry ? `Таван Тансаг · Шинэ хүсэлт ${row.sourceId}` : "Таван Тансаг · Хүрээлэлд нэгдэх шинэ хүсэлт",
    text: [
      inquiry ? "Эдлэлийн талаар шинэ хүсэлт ирлээ." : "Таван Тансагийн хүрээлэлд нэгдэх шинэ хүсэлт ирлээ.",
      inquiry ? `Хүсэлтийн дугаар: ${row.sourceId}` : `Бүртгэлийн дугаар: ${row.sourceId}`,
      ...(inquiry ? [`Эдлэл: ${row.productId ?? "Ерөнхий зөвлөгөө"}`] : []),
      `Хэл: ${row.locale === "mn" ? "Монгол" : "Англи"}`,
      `Ирсэн: ${row.createdAt}`,
      "",
      "Мэдээллийг ажилтны эрхээр нэвтэрч харна уу:",
      "https://tavantansag.com/mn/staff",
      inquiry ? "CRM → Хүсэлтүүд" : "CRM → Хүрээллийн хүсэлт",
      "",
      "Таван Тансагийн автомат мэдэгдэл. Энэ нь захиалга эсвэл уулзалт баталгаажуулсан утгатай биш.",
    ].join("\n"),
  };
}
