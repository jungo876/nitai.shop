import { z } from "zod";
import { ADMIN_ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, REMAINING_PAYMENT_METHODS } from "@/lib/order-status";

export const createPaymentSchema = z.object({
  payment_method: z.enum(PAYMENT_METHODS, { error: "Choose Prepaid or Cash on delivery." }),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().trim().regex(/^order_[A-Za-z0-9]+$/, "Invalid payment reference."),
  razorpay_payment_id: z.string().trim().regex(/^pay_[A-Za-z0-9]+$/, "Invalid payment reference."),
  razorpay_signature: z.string().trim().regex(/^[0-9a-f]{64}$/i, "Invalid payment signature."),
});

export const adminUpdateOrderSchema = z
  .object({
    order_id: z.uuid("Invalid order."),
    order_status: z.enum(ADMIN_ORDER_STATUSES).optional(),
    payment_status: z.enum(PAYMENT_STATUSES).optional(),
    remaining_payment_method: z.enum(REMAINING_PAYMENT_METHODS).nullable().optional(),
    admin_notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 1, { message: "Nothing to update." });
