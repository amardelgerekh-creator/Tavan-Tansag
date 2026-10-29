import { z } from "zod";

const contactValue = z.string().trim().min(5).max(160);

export const inquirySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    contactMethod: z.enum(["email", "phone"]),
    contactValue,
    message: z.string().trim().min(10).max(2000),
    locale: z.enum(["mn", "en"]),
    productId: z
      .string()
      .regex(/^TT-\d{3,6}$/)
      .optional(),
    website: z.string().max(0).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.contactMethod === "email" &&
      !z.string().email().safeParse(value.contactValue).success
    ) {
      context.addIssue({
        code: "custom",
        path: ["contactValue"],
        message: "Enter a valid email address.",
      });
    }
    const phoneDigits = value.contactValue.replace(/\D/g, "").length;
    const validPhone =
      /^\+?[\d\s().-]{7,30}$/.test(value.contactValue) &&
      phoneDigits >= 7 &&
      phoneDigits <= 15;
    if (value.contactMethod === "phone" && !validPhone) {
      context.addIssue({
        code: "custom",
        path: ["contactValue"],
        message: "Enter a valid phone number.",
      });
    }
  });

export const idempotencyKeySchema = z.string().regex(/^[a-zA-Z0-9_-]{16,128}$/);
export type InquiryInput = z.infer<typeof inquirySchema>;

export function normalizeContact(
  input: Pick<InquiryInput, "contactMethod" | "contactValue">,
): string {
  return input.contactMethod === "email"
    ? input.contactValue.toLowerCase()
    : input.contactValue.replace(/[\s().-]/g, "");
}

export type PersistenceResult =
  | { ok: true; reference: string; duplicate: boolean }
  | {
      ok: false;
      code:
        | "RATE_LIMITED"
        | "IDEMPOTENCY_CONFLICT"
        | "UNKNOWN_PRODUCT"
        | "UNAVAILABLE";
    };

export type PersistInquiry = (
  input: InquiryInput,
  idempotencyKey: string,
  context?: { clientIp: string },
) => Promise<PersistenceResult>;
