import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offers and bulk discounts",
  description: "Current offers and bulk box discounts on pesticides, fungicides, herbicides and fertilisers.",
  alternates: { canonical: "/offers" },
};

export default function OffersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
