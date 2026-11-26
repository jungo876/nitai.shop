import { z } from "zod";
import { normalizeIndianMobile } from "@/lib/phone";

/** Indian mobile number in any common format -> normalised 10 digits. */
export const indianMobile = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeIndianMobile(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit Indian mobile number." });
      return z.NEVER;
    }
    return n;
  });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** GSTIN: 15 chars, e.g. 19ABCDE1234F1Z5 (empty allowed). */
const gstNumber = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v === "" || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), "Invalid GST number (15 characters, e.g. 19ABCDE1234F1Z5).")
  .optional()
  .transform((v) => (v ? v : null));

/** PAN: AAAAA9999A (empty allowed). */
const panNumber = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v === "" || /^[A-Z]{5}\d{4}[A-Z]$/.test(v), "Invalid PAN (e.g. ABCDE1234F).")
  .optional()
  .transform((v) => (v ? v : null));

export const BUSINESS_TYPES = ["retailer", "distributor", "dealer", "farmer", "other"] as const;

export const otpRequestSchema = z.object({ phone_number: indianMobile });
export const otpVerifySchema = z.object({
  phone_number: indianMobile,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

/** Profile setup / edit. The user is always taken from the session, never from the body. */
export const setupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  whatsapp_number: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = normalizeIndianMobile(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Enter a valid WhatsApp number." });
        return z.NEVER;
      }
      return n;
    }),
  shop_name: z.string().trim().min(1, "Shop name is required.").max(200),
  gst_number: gstNumber,
  pan_number: panNumber,
  business_type: z
    .enum(BUSINESS_TYPES)
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => v ?? null),
  address_line: z.string().trim().min(5, "Please enter the full address.").max(500),
  landmark: optionalText(200),
  city: z.string().trim().min(2, "City is required.").max(100),
  state: z.string().trim().min(2, "State is required.").max(100),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Pincode must be 6 digits."),
});

export type SetupInput = z.infer<typeof setupSchema>;
