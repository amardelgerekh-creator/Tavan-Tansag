import type { Localized } from "@/lib/catalog";

// Public business details supplied directly by the owner on 2026-10-30.
// Working days have not been supplied; these hours do not imply daily opening.
export const businessDetails: {
  address: Localized;
  phone: string;
  phoneDisplay: string;
  email: string;
  hours: string;
  workingDays: null;
  timeZone: string;
} = {
  address: {
    mn: "Улаанбаатар хот, Сүхбаатар дүүрэг, Жуулчны гудамж, Таван Тансаг",
    en: "Tavan Tansag, Juulchin Street, Sukhbaatar District, Ulaanbaatar, Mongolia",
  },
  phone: "+97688111323",
  phoneDisplay: "+976 8811 1323",
  email: "hello@tavantansag.com",
  hours: "10:00–17:30",
  workingDays: null,
  timeZone: "Asia/Ulaanbaatar",
};
