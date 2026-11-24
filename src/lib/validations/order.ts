import { z } from "zod";

const orderStatuses = ["placed", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
const paymentStatuses = ["pending", "advance_paid", "paid", "failed", "cancelled"] as const;
const paymentMethods = ["prepaid", "cod"] as const;

/* ─── Create Order (after Razorpay payment) ─── */
export const createOrderSchema = z.object({
  razorpay_order_id: z.string().min(1, "Razorpay order ID is required"),
  razorpay_payment_id: z.string().min(1, "Razorpay payment ID is required"),
  payment_method: z.enum(paymentMethods).default("prepaid"),
});

/* ─── Admin: Update Order Status ─── */
export const updateOrderStatusSchema = z.object({
  order_id: z.string().uuid("Invalid order ID"),
  order_status: z.enum(orderStatuses).optional(),
  payment_status: z.enum(paymentStatuses).optional(),
}).refine(
  (data) => data.order_status || data.payment_status,
  { message: "At least one status field must be provided" }
);
