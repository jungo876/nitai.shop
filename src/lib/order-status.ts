/**
 * The ONE definition of order/payment statuses, shared by the database
 * constraints (migration 002), the API and every screen.
 */

export const ORDER_STATUSES = ["pending_payment", "placed", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "advance_paid", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["prepaid", "cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const REMAINING_PAYMENT_METHODS = ["cash_on_delivery", "upi", "bank_transfer", "cash"] as const;
export type RemainingPaymentMethod = (typeof REMAINING_PAYMENT_METHODS)[number];

/** Statuses an admin may set by hand (pending_payment is system-managed). */
export const ADMIN_ORDER_STATUSES = ["placed", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  placed: "Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Payment pending",
  advance_paid: "Advance paid",
  paid: "Fully paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  prepaid: "Prepaid (full payment online)",
  cod: "Cash on delivery (advance paid online)",
};

export const REMAINING_METHOD_LABEL: Record<RemainingPaymentMethod, string> = {
  cash_on_delivery: "Cash on delivery",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  cash: "Cash",
};

/** Tailwind classes for status badges. */
export const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  pending_payment: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  placed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  processing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const PAYMENT_STATUS_STYLE: Record<PaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  advance_paid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

/** "NCK-000123" */
export function formatOrderNumber(n: number | null | undefined): string {
  return n ? `NCK-${String(n).padStart(6, "0")}` : "";
}
