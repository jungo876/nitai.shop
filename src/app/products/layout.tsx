import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "All products — insecticides, fungicides, herbicides & fertilisers",
    template: "%s | NCK Agro",
  },
  description:
    "Browse our full range of crop protection and crop nutrition products with pack sizes and bulk box prices. Order online with secure payment or Cash on Delivery.",
  alternates: { canonical: "/products" },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
