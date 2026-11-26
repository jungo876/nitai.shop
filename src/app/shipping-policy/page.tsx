import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Shipping & Delivery Policy — NCK Agro" };

export default function ShippingPolicyPage() {
  return (
    <PolicyPage title="Shipping & Delivery Policy" updated="26 November 2026">
      <h2>Where we deliver</h2>
      <p>
        We deliver within India to the addresses our transport partners can reach. If we cannot deliver to your pincode, we will
        contact you and refund your payment in full.
      </p>

      <h2>When your order is dispatched</h2>
      <ul>
        <li>Orders are dispatched within <strong>1–3 working days</strong> after payment (or the advance) is received.</li>
        <li>
          Delivery usually takes <strong>3–10 working days</strong> after dispatch, depending on distance and transport availability.
        </li>
        <li>Large bulk orders may be sent in more than one consignment. We will tell you if this happens.</li>
      </ul>

      <h2>Delivery charges</h2>
      <p>
        The amount shown at checkout is what you pay online. If an order needs special transport (for example a very large or
        remote delivery) and there is any extra charge, we will tell you and get your agreement before dispatch.
      </p>

      <h2>Tracking your order</h2>
      <p>
        You can see the status of every order (Placed, Confirmed, Shipped, Delivered) under <strong>My Orders</strong>. We may also send
        you transport or tracking details by phone or WhatsApp.
      </p>

      <h2>Cash on Delivery</h2>
      <p>
        For Cash on Delivery orders, the advance is paid online when you order and the balance is paid when the goods are delivered.
        Please keep the balance ready, in cash or by UPI, as agreed with us.
      </p>

      <h2>At delivery</h2>
      <p>
        Please check the packages before signing for them. Report any damage, leakage or missing items within 48 hours, as explained
        in our Cancellation &amp; Refund Policy.
      </p>
    </PolicyPage>
  );
}
