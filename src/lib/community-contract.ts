import { z } from "zod";
import { categoryIds } from "./catalog";

/** Immutable wording for consentVersion; changes to purpose or wording require a new version. */
export const communityConsentVersion = "community-request-v1" as const;
export const communityConsentText = {
  mn: "Таван Тансагийн шинэ эдлэл, өв соёлын түүх, арга хэмжээний тухай и-мэйл мэдээлэл авахыг зөвшөөрч байна. Миний нэр, и-мэйл, сонгосон сонирхлыг энэ зорилгоор ашиглах бөгөөд би хүссэн үедээ зөвшөөрлөө цуцалж болно.",
  en: "I agree to receive email updates about Tavan Tansag collections, heritage stories and events. My name, email and selected interests may be used for this purpose, and I can withdraw my consent at any time.",
} as const;
export const communityStatuses = ["requested", "contacted", "withdrawn"] as const;
export type CommunityStatus = (typeof communityStatuses)[number];
const interests = z.array(z.enum(categoryIds)).min(1).max(5).refine((values) => new Set(values).size === values.length, "Choose each interest once.");
const email = z.string().trim().max(254).email().transform((value) => value.toLowerCase());
export const communityInputSchema = z.object({
  email,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  interests,
  locale: z.enum(["mn", "en"]),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
}).strict();
export type CommunityInput = z.infer<typeof communityInputSchema>;
export const communityKeySchema = z.string().uuid();
export const communityIdSchema = z.string().regex(/^CM-[a-f0-9]{64}$/);
export const communityPatchSchema = z.object({
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1),
  status: z.enum(communityStatuses),
}).strict();
export type CommunityPatch = z.infer<typeof communityPatchSchema>;
export const communityRecordSchema = z.object({
  id: communityIdSchema, email,
  firstName: z.string().min(1).max(80), lastName: z.string().max(80).nullable(),
  interests, locale: z.enum(["mn", "en"]),
  consent: z.literal(true), consentVersion: z.literal(communityConsentVersion), consentAt: z.iso.datetime(),
  emailVerified: z.literal(false), status: z.enum(communityStatuses),
  revision: z.number().int().nonnegative(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
}).strict();
export type CommunityRecord = z.infer<typeof communityRecordSchema>;
export const communityPageSchema = z.object({
  items: z.array(communityRecordSchema).max(30), hasMore: z.boolean(), nextCursor: z.string().max(512).nullable(),
}).strict();
export type CommunityPage = z.infer<typeof communityPageSchema>;
export type CommunityPersistenceResult = { ok: true; notificationId?: string } | { ok: false; code: "RATE_LIMITED" | "IDEMPOTENCY_CONFLICT" | "UNAVAILABLE" };
export type PersistCommunity = (input: CommunityInput, key: string, context?: { clientIp: string }) => Promise<CommunityPersistenceResult>;
