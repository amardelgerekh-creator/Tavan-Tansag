import type { Locale } from "./catalog";

export const inquiryPurposes = ["general", "visit", "gift", "international", "care"] as const;
export type InquiryPurpose = typeof inquiryPurposes[number];
export const inquiryPurposeLabels: Record<InquiryPurpose, Record<Locale, string>> = {
  general: { mn: "Эдлэлийн талаар зөвлөгөө", en: "Advice about a piece" },
  visit: { mn: "Уулзалт, үзэх цаг тохирох", en: "Arrange a visit or viewing" },
  gift: { mn: "Бэлэг, савлагаа лавлах", en: "Gifting and packaging" },
  international: { mn: "Гадаад хүргэлт лавлах", en: "International delivery enquiry" },
  care: { mn: "Арчилгааны зөвлөгөө", en: "Care advice" },
};
export function inquiryPurpose(value: unknown): InquiryPurpose {
  return inquiryPurposes.includes(value as InquiryPurpose) ? value as InquiryPurpose : "general";
}
