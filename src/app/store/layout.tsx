import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Store — shop by category",
  description: "Shop crop protection, crop nutrition, seeds and agro tools by category at wholesale prices.",
  alternates: { canonical: "/store" },
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
