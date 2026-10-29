import { notFound } from "next/navigation";
import { isLocale } from "@/lib/catalog";
import { staffConfigured } from "@/lib/server/staff-auth";
import { CrmDashboard } from "@/components/crm-dashboard";
import "@/app/crm.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ажилтны хэсэг · Staff", robots: { index: false, follow: false } };

export default async function StaffPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!staffConfigured()) return <section className="container section"><h1>{locale === "mn" ? "Ажилтны хэсэг" : "Staff workspace"}</h1><p>{locale === "mn" ? "Нэвтрэлтийн тохиргоог бэлтгэж байна." : "Staff sign-in is being configured."}</p></section>;
  return <CrmDashboard locale={locale} config={{
    apiKey: process.env.FIREBASE_WEB_API_KEY,
    appId: process.env.FIREBASE_WEB_APP_ID,
    projectId: process.env.FIREBASE_PROJECT_ID,
    authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
  }} />;
}
