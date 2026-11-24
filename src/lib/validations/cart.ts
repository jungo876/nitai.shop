import { z } from "zod";

/* ─── Add to Cart ─── */
export const addToCartSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  variant_id: z.string().uuid("Invalid variant ID"),
  bulk_price_id: z.string().uuid("Invalid bulk price ID").nullable().optional(),
  box_count: z.number().int("Box count must be a whole number").min(1, "Minimum 1 box"),
  quantity: z.number().int("Quantity must be a whole number").min(1, "Minimum quantity is 1").default(1),
});

/* ─── Update Cart Item ─── */
export const updateCartSchema = z.object({
  quantity: z.number().int().min(1, "Minimum quantity is 1"),
});

/* ─── Delete Cart Item ─── */
export const deleteCartSchema = z.object({
  item_id: z.string().uuid("Invalid cart item ID"),
});
