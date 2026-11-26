import { z } from "zod";
import { normalizeIndianMobile } from "@/lib/phone";

const optionalPhone = (label: string) =>
  z
    .string()
    .trim()
    .max(20)
    .optional()
    .nullable()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = normalizeIndianMobile(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: `${label} must be a valid 10-digit Indian mobile number.` });
        return z.NEVER;
      }
      return n;
    });

export const storeSettingsSchema = z.object({
  store_name: z.string().trim().min(2).max(80),
  support_phone: optionalPhone("Support phone"),
  whatsapp_number: optionalPhone("WhatsApp number"),
  support_email: z.email("Enter a valid email address.").max(120).optional().nullable().or(z.literal("").transform(() => null)),
  business_address: z.string().trim().max(500).optional().nullable().transform((v) => v || null),
  store_status: z.enum(["open", "closed"]),
  closed_message: z.string().trim().max(300).optional().nullable().transform((v) => v || null),
  cod_enabled: z.boolean(),
  cod_advance_percent: z.number().int().min(1, "Advance must be at least 1%.").max(100),
  min_order_amount: z.number().min(0).max(10_000_000),
});
