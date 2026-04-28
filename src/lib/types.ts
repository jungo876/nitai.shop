export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  image_url: string;
  created_at: string;
}

export type ProductInsert = Omit<Product, "id" | "created_at">;

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
