import { z } from "zod";
import { inquiryPurposes } from "./inquiry-options";

export const crmStatuses = ["new", "contacted", "consultation", "quoted", "won", "closed"] as const;
export type CrmStatus = typeof crmStatuses[number];

export const crmPatchSchema = z.object({
  revision: z.number().int().min(0),
  status: z.enum(crmStatuses),
  assignee: z.string().trim().min(1).max(160),
  followUpAt: z.iso.datetime().nullable(),
  notes: z.string().trim().max(4000),
}).strict();
export type CrmPatch = z.infer<typeof crmPatchSchema>;

export const inquiryRecordSchema = z.object({
  reference: z.string().regex(/^TT-[A-F0-9]{20}$/),
  name: z.string(),
  contactMethod: z.enum(["email", "phone"]),
  contactValue: z.string(),
  message: z.string(),
  locale: z.enum(["mn", "en"]),
  purpose: z.enum(inquiryPurposes).optional().default("general"),
  productId: z.string().nullable(),
  productName: z.object({ mn: z.string(), en: z.string() }).nullable(),
  status: z.enum(crmStatuses),
  assignee: z.string(),
  followUpAt: z.string().nullable(),
  notes: z.string(),
  revision: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InquiryRecord = z.infer<typeof inquiryRecordSchema>;
export type InquiryPage = { items: InquiryRecord[]; hasMore: boolean; nextCursor: string | null };
