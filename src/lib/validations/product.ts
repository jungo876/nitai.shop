import { z } from "zod";
import { CATEGORIES, HOME_CATEGORIES } from "@/lib/types";

const money = (label: string) =>
  z
    .number({ error: `${label} must be a number.` })
    .finite()
    .min(0, `${label} cannot be negative.`)
    .max(10_000_000, `${label} is too large.`)
    .transform((v) => Math.round(v * 100) / 100);

/** Image URLs must be https (Supabase Storage) or empty. */
const imageUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Image must be an https:// URL.")
  .default("");

export const bulkTierSchema = z.object({
  id: z.uuid().optional().nullable(),
  box_count: z.number().int("Boxes must be a whole number.").min(1, "Boxes must be at least 1.").max(10000),
  price_per_unit: money("Bulk price").refine((v) => v > 0, "Bulk price must be more than 0."),
  tag: z.string().trim().max(30).optional().nullable().transform((v) => v || null),
});

export const variantSchema = z
  .object({
    id: z.uuid().optional().nullable(),
    label: z.string().trim().min(1, "Pack size label is required.").max(50),
    unit_price: money("Unit price"),
    units_per_box: z.number().int("Units per box must be a whole number.").min(1, "Units per box must be at least 1.").max(100000),
    bulk_prices: z.array(bulkTierSchema).max(20).optional().default([]),
  })
  .refine((v) => new Set(v.bulk_prices.map((b) => b.box_count)).size === v.bulk_prices.length, {
    message: "Two bulk offers have the same number of boxes.",
    path: ["bulk_prices"],
  });

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(200),
  category: z.enum(CATEGORIES, { error: "Choose a category." }),
  home_category: z.enum(HOME_CATEGORIES).nullable().optional().transform((v) => v ?? null),
  description: z.string().trim().max(5000, "Description is too long.").default(""),
  image_url: imageUrl,
  company_id: z.uuid("Invalid brand.").nullable().optional().transform((v) => v ?? null),
  is_top_selling: z.boolean().default(false),
  status: z.enum(["active", "out_of_stock", "coming_soon", "hidden"]).default("active"),
  variants: z.array(variantSchema).max(30).default([]),
});
export type ProductInput = z.infer<typeof productSchema>;

export const companySchema = z.object({
  name: z.string().trim().min(1, "Brand name is required.").max(120),
  logo_url: imageUrl,
});

/** Banner links: internal paths ("/products?...") or https URLs. Never javascript: etc. */
export const bannerSchema = z.object({
  title: z.string().trim().max(120).optional().nullable().transform((v) => v || null),
  image_url: z.string().trim().max(1000).refine((v) => /^https:\/\/[^\s]+$/i.test(v), "Banner image must be an https:// URL."),
  redirect_url: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((v) => v || null)
    .refine((v) => v === null || /^\/(?!\/)[^\s]*$/.test(v) || /^https:\/\/[^\s]+$/i.test(v), "Link must start with / or https://"),
  display_order: z.number().int().min(0).max(1000).default(0),
  is_active: z.boolean().default(true),
});
export const bannerUpdateSchema = bannerSchema.partial();

export const wishlistSchema = z.object({ product_id: z.uuid("Invalid product.") });
