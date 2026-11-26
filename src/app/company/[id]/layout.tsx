import type { Metadata } from "next";
import { getCompany } from "@/server/catalog";
import { siteUrl } from "@/lib/seo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = UUID.test(id) ? await getCompany(id).catch(() => null) : null;
  if (!c) return { title: "Brand" };
  const name = c.name as string;
  return {
    title: `${name} products — wholesale prices`,
    description: `Buy ${name} insecticides, fungicides, herbicides and fertilisers at bulk box prices. Secure online payment or Cash on Delivery.`,
    alternates: { canonical: `${siteUrl()}/company/${id}` },
    openGraph: { title: `${name} products`, images: c.logo_url ? [{ url: c.logo_url as string, alt: name }] : undefined },
  };
}

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
