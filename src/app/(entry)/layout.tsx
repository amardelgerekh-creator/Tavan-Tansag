import type { Metadata } from "next";
import "../globals.css";
export const metadata: Metadata = {
  title: "Tavan Tansag",
  robots: { index: false, follow: false },
};
export default function EntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
