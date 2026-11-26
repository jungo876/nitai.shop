import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientLayout } from "./client-layout";
import { DEFAULT_DESCRIPTION, SITE_NAME, jsonLd, siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "NCK Agro — Wholesale Pesticides, Fungicides & Fertilisers Online",
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "pesticides wholesale", "insecticide", "fungicide", "herbicide", "fertilizer", "agro inputs",
    "crop protection", "pesticide dealer", "bulk pesticide price", "agri inputs online India",
    "কীটনাশক", "সার", "ছত্রাকনাশক", "আগাছানাশক", "কৃষি",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    url: "/",
    title: "NCK Agro — Wholesale agro inputs at bulk prices",
    description: DEFAULT_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16a34a",
};

/** Who we are, for Google's knowledge panel / search results. */
const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: siteUrl(),
  logo: `${siteUrl()}/icon`,
  description: DEFAULT_DESCRIPTION,
};
const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: siteUrl(),
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${siteUrl()}/products?search={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className="h-full antialiased scroll-smooth" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col font-sans">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(website) }} />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
