import { z } from "zod";

export const addToCartSchema = z.object({
  product_id: z.uuid("Invalid product."),
  variant_id: z.uuid("Invalid pack size."),
  bulk_price_id: z.uuid("Invalid bulk offer.").nullable().optional().transform((v) => v ?? null),
  box_count: z.number().int("Box count must be a whole number.").min(1, "Minimum 1 box.").max(10000),
  quantity: z.number().int().min(1).max(1000).optional().default(1),
});

export const updateCartSchema = z.object({
  item_id: z.uuid("Invalid cart item."),
  quantity: z.number().int("Quantity must be a whole number.").min(1, "Minimum quantity is 1.").max(1000, "Maximum quantity is 1000."),
});

export const removeCartSchema = z.object({
  item_id: z.uuid("Invalid cart item."),
});
