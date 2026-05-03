export interface Company {
  id: string;
  name: string;
  logo_url: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  image_url: string;
  company_id: string | null;
  is_top_selling?: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  label: string;
  unit_price: number;
  units_per_box: number;
  created_at: string;
}

export interface BulkPrice {
  id: string;
  variant_id: string;
  box_count: number;
  price_per_unit: number;
  tag: string | null;
  created_at: string;
}

export interface VariantWithBulkPrices extends ProductVariant {
  bulk_prices: BulkPrice[];
}

export interface ProductWithVariants extends Product {
  product_variants: VariantWithBulkPrices[];
  companies?: Company | null;
}

export const CATEGORIES = [
  "Insecticide",
  "Fungicide",
  "Herbicide",
  "Fertilizer",
  "Plant Growth Regulator",
  "Bio Pesticide",
  "Rodenticide",
  "Seed Treatment",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
