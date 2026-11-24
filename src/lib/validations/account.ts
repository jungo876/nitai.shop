import { z } from "zod";

/** Indian phone: 10 digits, optionally prefixed with +91 or 91 */
const indianPhone = z
  .string()
  .trim()
  .regex(/^(\+?91)?[6-9]\d{9}$/, "Must be a valid Indian mobile number");

/** GST: 15 chars alphanumeric (standard GSTIN format) */
const gstNumber = z
  .string()
  .trim()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/, "Invalid GST number format")
  .optional()
  .or(z.literal(""));

/** PAN: 10 chars AAAAA9999A */
const panNumber = z
  .string()
  .trim()
  .regex(/^[A-Z]{5}\d{4}[A-Z]{1}$/, "Invalid PAN number format")
  .optional()
  .or(z.literal(""));

/** Pincode: exactly 6 digits */
const pincode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Pincode must be 6 digits");

/* ─── Login ─── */
export const loginSchema = z.object({
  phone_number: z.string().min(10, "Phone number must be at least 10 digits"),
});

/* ─── Profile Setup ─── */
export const setupSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  whatsapp_number: indianPhone.optional().or(z.literal("")),
  shop_name: z.string().trim().min(1, "Shop name is required").max(200),
  gst_number: gstNumber,
  pan_number: panNumber,
  business_type: z.string().max(50).optional().or(z.literal("")),
  address_line: z.string().trim().min(1, "Address is required").max(500),
  landmark: z.string().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(100),
  pincode: pincode,
});
