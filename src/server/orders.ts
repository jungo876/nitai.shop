import "server-only";
import { db } from "./db";
import { badRequest, conflict, forbidden, HttpError, notFound } from "./http";
import { log } from "./logger";
import { getCartLines, summarise } from "./cart";
import { getStoreSettings } from "./settings";
import type { SessionUser } from "./auth/session";
import {
  capturePayment,
  createRazorpayOrder,
  fetchPayment,
  isValidCheckoutSignature,
  razorpayKeyId,
} from "./payments/razorpay";
import { advancePaise, fromPaise, toPaise } from "@/lib/money";
import { formatOrderNumber, type PaymentMethod } from "@/lib/order-status";

/**
 * Checkout and payment confirmation.
 *
 *  1. createPendingOrder: validates profile + cart + store rules, snapshots
 *     prices/customer/address into an order with status `pending_payment`,
 *     then creates the matching Razorpay order for the exact amount.
 *  2. confirmPayment (browser callback or webhook): checks the signature
 *     (browser) and fetches the payment from Razorpay to verify order id,
 *     amount, currency and status. Idempotent; the first confirmation wins.
 *  3. expirePendingOrders: unpaid orders are cancelled after PAYMENT_WINDOW.
 *     A late but valid payment still revives the order (money is never lost).
 */

export const PAYMENT_WINDOW_MINUTES = 30;
const ABANDONED_REASONS = ["superseded", "payment_timeout", "payment_init_failed"];

async function loadCheckoutProfile(userId: string) {
  const sql = db();
  const [row] = await sql`
    select u.name, u.phone_number, u.whatsapp_number, u.is_profile_complete,
           b.shop_name, b.gst_number, b.pan_number, b.business_type,
           a.address_line, a.landmark, a.city, a.state, a.pincode, a.phone_number as address_phone
    from users u
    left join business_profiles b on b.user_id = u.id
    left join addresses a on a.user_id = u.id
    where u.id = ${userId}`;
  return row;
}

/** Everything the checkout page shows, computed on the server. */
export async function checkoutSummary(user: SessionUser) {
  const [profile, settings, lines] = await Promise.all([loadCheckoutProfile(user.id), getStoreSettings(), getCartLines(user.id)]);
  const cart = summarise(lines);
  return {
    user: { id: user.id, name: profile?.name ?? null, phone_number: user.phone_number, whatsapp_number: profile?.whatsapp_number ?? null },
    business_profile: profile?.shop_name
      ? { shop_name: profile.shop_name, gst_number: profile.gst_number, pan_number: profile.pan_number, business_type: profile.business_type }
      : null,
    address: profile?.address_line
      ? { address_line: profile.address_line, landmark: profile.landmark, city: profile.city, state: profile.state, pincode: profile.pincode, phone_number: profile.address_phone }
      : null,
    items: cart.items,
    item_count: cart.count,
    subtotal: cart.subtotal,
    has_unavailable: cart.has_unavailable,
    settings: {
      store_status: settings.store_status,
      closed_message: settings.closed_message,
      cod_enabled: settings.cod_enabled,
      cod_advance_percent: settings.cod_advance_percent,
      min_order_amount: settings.min_order_amount,
    },
  };
}

export async function createPendingOrder(user: SessionUser, method: PaymentMethod) {
  const sql = db();
  const [profile, settings, lines] = await Promise.all([loadCheckoutProfile(user.id), getStoreSettings(), getCartLines(user.id)]);

  if (settings.store_status !== "open") {
    throw conflict(settings.closed_message || "We are not taking orders right now. Please try again later.", "store_closed");
  }
  if (!profile?.is_profile_complete || !profile.shop_name || !profile.address_line || !profile.city || !profile.pincode) {
    throw new HttpError(409, "Please complete your shop details and delivery address first.", "profile_incomplete", { redirect: "/account/setup" });
  }
  if (lines.length === 0) throw new HttpError(400, "Your cart is empty.", "cart_empty", { redirect: "/cart" });
  if (lines.some((l) => !l.available)) {
    throw new HttpError(409, "Some items in your cart are no longer available. Please remove them to continue.", "cart_unavailable", { redirect: "/cart" });
  }
  if (method === "cod" && !settings.cod_enabled) throw badRequest("Cash on delivery is not available right now.");

  const totalPaise = lines.reduce((s, l) => s + l.total_paise, 0);
  if (totalPaise < toPaise(settings.min_order_amount)) {
    throw badRequest(`Minimum order value is ₹${settings.min_order_amount.toLocaleString("en-IN")}.`);
  }
  const payNowPaise = method === "prepaid" ? totalPaise : advancePaise(totalPaise, settings.cod_advance_percent);
  if (payNowPaise < 100) throw badRequest("Order amount is too small for online payment.");

  const customer = {
    name: profile.name, phone_number: profile.phone_number, whatsapp_number: profile.whatsapp_number,
    shop_name: profile.shop_name, gst_number: profile.gst_number, pan_number: profile.pan_number, business_type: profile.business_type,
  };
  const address = {
    address_line: profile.address_line, landmark: profile.landmark, city: profile.city,
    state: profile.state, pincode: profile.pincode, phone_number: profile.address_phone ?? profile.phone_number,
  };

  const order = await sql.begin(async (tx) => {
    // Only one checkout attempt at a time per customer; earlier unpaid attempts are abandoned.
    await tx`
      update orders set order_status = 'cancelled', payment_status = 'failed', cancelled_at = now(), cancel_reason = 'superseded'
      where user_id = ${user.id} and order_status = 'pending_payment'`;
    const [o] = await tx`
      insert into orders (user_id, total_amount, advance_amount, remaining_amount, payment_status, order_status,
                          payment_method, remaining_payment_method, customer_snapshot, shipping_address, payment_expires_at)
      values (${user.id}, ${fromPaise(totalPaise)}, ${fromPaise(payNowPaise)}, ${fromPaise(totalPaise - payNowPaise)},
              'pending', 'pending_payment', ${method}, ${method === "cod" ? "cash_on_delivery" : null},
              ${tx.json(customer)}, ${tx.json(address)}, now() + make_interval(mins => ${PAYMENT_WINDOW_MINUTES}))
      returning id, order_number`;
    for (const l of lines) {
      await tx`
        insert into order_items (order_id, product_id, variant_id, bulk_price_id, product_name, variant_label,
                                 box_count, units_per_box, price_per_unit, total_units, total_price)
        values (${o.id}, ${l.product_id}, ${l.variant_id}, ${l.bulk_price_id}, ${l.product_name}, ${l.variant_label},
                ${l.box_count * l.quantity}, ${l.units_per_box}, ${fromPaise(l.unit_price_paise)}, ${l.total_units}, ${fromPaise(l.total_paise)})`;
    }
    return o;
  });

  let rzp;
  try {
    rzp = await createRazorpayOrder({
      amountPaise: payNowPaise,
      receipt: `nck_${order.order_number}`,
      notes: { order_id: order.id, order_number: formatOrderNumber(order.order_number), payment_method: method },
    });
  } catch (err) {
    await sql`update orders set order_status = 'cancelled', payment_status = 'failed', cancelled_at = now(),
              cancel_reason = 'payment_init_failed' where id = ${order.id}`;
    throw err;
  }
  await sql`update orders set razorpay_order_id = ${rzp.id} where id = ${order.id}`;

  return {
    order_id: order.id as string,
    order_number: formatOrderNumber(order.order_number),
    razorpay_order_id: rzp.id,
    key_id: razorpayKeyId(),
    amount_paise: payNowPaise,
    currency: "INR",
    payment_method: method,
    total: fromPaise(totalPaise),
    pay_now: fromPaise(payNowPaise),
    remaining: fromPaise(totalPaise - payNowPaise),
    description:
      method === "cod"
        ? `Advance (${settings.cod_advance_percent}%) for order ${formatOrderNumber(order.order_number)}`
        : `Payment for order ${formatOrderNumber(order.order_number)}`,
    prefill: { name: profile.name ?? "", contact: profile.phone_number },
  };
}

export interface ConfirmInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature?: string;
  /** When set, the order must belong to this user (browser flow). */
  userId?: string;
  source: "checkout" | "webhook";
}

export async function confirmPayment(input: ConfirmInput) {
  if (input.source === "checkout") {
    if (!input.signature || !isValidCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId, input.signature)) {
      log.warn("payment_signature_invalid", { razorpayOrderId: input.razorpayOrderId });
      throw badRequest("Payment could not be verified.");
    }
  }

  const sql = db();
  const [order] = await sql`
    select id, user_id, order_number, advance_amount, payment_method, payment_status, order_status, cancel_reason
    from orders where razorpay_order_id = ${input.razorpayOrderId}`;
  if (!order) throw notFound("Order not found for this payment.");
  if (input.userId && order.user_id !== input.userId) throw forbidden();

  // Already confirmed (by the other path or a retry) — nothing more to do.
  if (order.payment_status === "paid" || order.payment_status === "advance_paid") {
    return { order_id: order.id as string, order_number: formatOrderNumber(order.order_number), already: true };
  }

  // Ask Razorpay what really happened; never trust the browser for amounts or status.
  let payment = await fetchPayment(input.razorpayPaymentId);
  const expectedPaise = toPaise(Number(order.advance_amount));
  if (payment.order_id !== input.razorpayOrderId || payment.amount !== expectedPaise || payment.currency !== "INR") {
    log.error("payment_mismatch", { orderId: order.id, expectedPaise, gotPaise: payment.amount, rzpOrder: payment.order_id });
    throw badRequest("Payment details do not match this order. Please contact support.");
  }
  if (payment.status === "authorized") payment = await capturePayment(payment.id, expectedPaise);
  if (payment.status !== "captured") {
    throw new HttpError(402, "Payment was not completed. You have not been charged for this order.", "payment_incomplete");
  }

  const result = await sql.begin(async (tx) => {
    const [o] = await tx`select payment_status, order_status, cancel_reason from orders where id = ${order.id} for update`;
    if (o.payment_status === "paid" || o.payment_status === "advance_paid") return { already: true };
    if (o.order_status === "cancelled" && !ABANDONED_REASONS.includes(o.cancel_reason)) {
      // Cancelled by an admin before payment arrived: record the payment but keep it cancelled for a refund.
      await tx`update orders set razorpay_payment_id = ${payment.id}, razorpay_signature = ${input.signature ?? null},
                                 payment_status = ${order.payment_method === "prepaid" ? "paid" : "advance_paid"}, paid_at = now(),
                                 admin_seen_at = null, admin_notes = coalesce(admin_notes || E'\n', '') || 'Payment received after cancellation — refund needed.'
               where id = ${order.id}`;
      log.error("payment_on_cancelled_order", { orderId: order.id });
      return { already: false };
    }
    await tx`
      update orders set
        payment_status = ${order.payment_method === "prepaid" ? "paid" : "advance_paid"},
        order_status = 'placed', paid_at = now(), cancelled_at = null, cancel_reason = null, admin_seen_at = null,
        razorpay_payment_id = ${payment.id}, razorpay_signature = ${input.signature ?? null}
      where id = ${order.id}`;
    // Remove what was bought from the cart (anything added afterwards stays).
    await tx`
      delete from cart_items c using order_items oi
      where oi.order_id = ${order.id} and c.user_id = ${order.user_id}
        and c.product_id = oi.product_id and c.variant_id = oi.variant_id
        and c.bulk_price_id is not distinct from oi.bulk_price_id`;
    return { already: false };
  });

  log.info("payment_confirmed", { orderId: order.id, source: input.source, method: order.payment_method, already: result.already });
  return { order_id: order.id as string, order_number: formatOrderNumber(order.order_number), already: result.already };
}

export async function expirePendingOrders(): Promise<number> {
  const r = await db()`
    update orders set order_status = 'cancelled', payment_status = 'failed', cancelled_at = now(), cancel_reason = 'payment_timeout'
    where order_status = 'pending_payment' and payment_expires_at < now()`;
  return r.count;
}

/** Customer-facing order list (abandoned checkout attempts are not shown). */
export async function listOrdersForUser(userId: string) {
  return db()`
    select id, order_number, total_amount, advance_amount, remaining_amount, payment_status, order_status,
           payment_method, remaining_payment_method, created_at, paid_at,
           (select count(*) from order_items oi where oi.order_id = o.id) as item_count
    from orders o
    where user_id = ${userId}
      and order_status <> 'pending_payment'
      and not (order_status = 'cancelled' and coalesce(cancel_reason, '') = any(${ABANDONED_REASONS}::text[]))
    order by created_at desc
    limit 200`;
}

export async function getOrderForUser(userId: string, orderId: string) {
  const sql = db();
  const [order] = await sql`
    select id, order_number, total_amount, advance_amount, remaining_amount, payment_status, order_status,
           payment_method, remaining_payment_method, razorpay_payment_id, shipping_address, customer_snapshot,
           created_at, paid_at, cancelled_at, cancel_reason
    from orders where id = ${orderId} and user_id = ${userId}`;
  if (!order) return null;
  const items = await sql`
    select id, product_id, variant_id, product_name, variant_label, box_count, units_per_box, price_per_unit,
           total_units, total_price
    from order_items where order_id = ${orderId} order by created_at, id`;
  return { order, items };
}
