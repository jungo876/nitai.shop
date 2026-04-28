import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "./client-layout";

export const metadata: Metadata = {
  title: "NCK Agro — B2B Pesticide Distribution",
  description:
    "Premium quality insecticides, fungicides, herbicides, and fertilizers for agricultural businesses. Order directly via WhatsApp.",
  keywords: [
    "pesticides", "insecticides", "fungicides", "herbicides", "fertilizer",
    "agriculture", "B2B", "wholesale", "crop protection",
    "কীটনাশক", "সার", "কৃষি",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col font-sans">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
