import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Cancellation & Refund Policy — NCK Agro" };

export default function RefundPolicyPage() {
  return (
    <PolicyPage title="Cancellation & Refund Policy" updated="26 November 2026">
      <h2>Cancelling an order</h2>
      <ul>
        <li>
          <strong>Before dispatch:</strong> contact us by phone or WhatsApp with your order number. We will cancel the order and refund
          everything you paid online (the full amount for prepaid orders, or the advance for Cash on Delivery orders).
        </li>
        <li>
          <strong>After dispatch:</strong> the order can no longer be cancelled. If you refuse a Cash on Delivery order at the door
          without a valid reason (see below), the advance may be kept to cover transport costs.
        </li>
        <li>
          We may cancel an order if a product is unavailable, the price was shown in error, or we cannot deliver to your address.
          You will then get a full refund of what you paid.
        </li>
      </ul>

      <h2>Damaged, wrong or missing items</h2>
      <p>
        Please check your delivery when it arrives. If anything is damaged, leaking, wrong, short or past its expiry date, tell us
        within <strong>48 hours of delivery</strong> with your order number and photos of the product and packaging. After checking,
        we will replace the item or refund its price.
      </p>

      <h2>Returns</h2>
      <p>
        For safety and legal reasons, agrochemicals and fertilisers that have been opened, used or stored by you cannot be returned.
        Sealed products can be returned only in the cases above (damaged, wrong, short or expired).
      </p>

      <h2>How refunds are paid</h2>
      <ul>
        <li>Refunds go back to the original payment method (UPI, card, net banking or wallet) through Razorpay.</li>
        <li>
          We start the refund within 2 working days of approving it. Your bank usually credits it within 5–7 working days after that.
        </li>
        <li>A balance you paid in cash on delivery is refunded by UPI or bank transfer to an account you give us.</li>
      </ul>

      <h2>Failed payments</h2>
      <p>
        If money was deducted but your order shows &ldquo;Payment pending&rdquo; or did not go through, do not pay again straight away. Such
        amounts are confirmed or returned automatically by your bank and Razorpay, usually within 5–7 working days. Contact us with the
        time of payment if you need help.
      </p>
    </PolicyPage>
  );
}
