import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brands — agrochemical and fertiliser companies",
  description: "Shop products by brand. Genuine insecticides, fungicides, herbicides and fertilisers from leading agro-input companies at wholesale prices.",
  alternates: { canonical: "/companies" },
};

export default function CompaniesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
