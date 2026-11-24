import { z } from "zod";

/* ─── Product Create/Update ─── */
export const productSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(200),
  category: z.string().trim().min(1, "Category is required").max(100),
  company_id: z.string().uuid("Invalid company ID").optional().nullable(),
  description: z.string().max(5000, "Description too long").optional().or(z.literal("")),
  image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

/* ─── Product Variant ─── */
export const variantSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  label: z.string().trim().min(1, "Label is required").max(50),
  unit_price: z.number().positive("Price must be positive"),
  units_per_box: z.number().int().min(1, "Must be at least 1 unit per box"),
});

/* ─── Bulk Price ─── */
export const bulkPriceSchema = z.object({
  variant_id: z.string().uuid("Invalid variant ID"),
  min_boxes: z.number().int().min(1),
  price_per_unit: z.number().positive("Price must be positive"),
});

/* ─── Wishlist ─── */
export const wishlistSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
});
