import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Terms & Conditions — NCK Agro" };

export default function TermsPage() {
  return (
    <PolicyPage title="Terms & Conditions" updated="26 November 2026">
      <p>
        These terms apply when you use this website or place an order with NCK Agro (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
        By creating an account or placing an order you agree to them.
      </p>

      <h2>1. Who can buy</h2>
      <p>
        This is a business-to-business store for retailers, dealers, distributors and farmers. You must be at least 18 years old
        and give correct details (name, shop name, address and, where you have one, GST number). If you resell insecticides or
        other regulated products, you are responsible for holding any licence the law requires.
      </p>

      <h2>2. Your account</h2>
      <p>
        You log in with a one-time code sent to your mobile number. Keep your phone secure: anyone who can receive your codes can
        use your account. Tell us at once if you think someone else has used it.
      </p>

      <h2>3. Prices and orders</h2>
      <ul>
        <li>Prices are in Indian Rupees and shown per unit; bulk (box) prices apply only to the box quantities shown.</li>
        <li>The amount shown at checkout is calculated by our system at that moment and is the amount you are asked to pay.</li>
        <li>Your order is placed only after the online payment (full amount, or the advance for Cash on Delivery) succeeds.</li>
        <li>
          If a product turns out to be unavailable or was shown at an obviously wrong price, we may cancel the order (or part of
          it) and refund what you paid in full.
        </li>
      </ul>

      <h2>4. Payment</h2>
      <p>
        Online payments are processed by Razorpay. We never see or store your card, UPI PIN or bank login. For Cash on Delivery
        orders you pay an advance online and the balance when the goods are delivered.
      </p>

      <h2>5. Delivery, cancellation and refunds</h2>
      <p>
        See our <Link href="/shipping-policy">Shipping &amp; Delivery</Link> and <Link href="/refund-policy">Cancellation &amp; Refunds</Link> policies.
      </p>

      <h2>6. Safe use of products</h2>
      <p>
        Agrochemicals must be stored, handled and used strictly according to the label and leaflet supplied by the manufacturer.
        Product descriptions on this website are for general information; the manufacturer&apos;s label is the authority on dosage,
        crops and safety. We are not responsible for loss or damage caused by use contrary to the label.
      </p>

      <h2>7. Our responsibility</h2>
      <p>
        We supply products as made by their manufacturers. Product quality claims are covered by the manufacturer&apos;s terms. Our total
        responsibility for any order is limited to the amount you paid for that order, except where the law does not allow such a limit.
      </p>

      <h2>8. Acceptable use</h2>
      <p>Do not misuse the website: no false orders, attempts to break security, automated scraping or interference with other users.</p>

      <h2>9. Changes and law</h2>
      <p>
        We may update these terms; the version on this page applies to new orders. These terms are governed by the laws of India,
        and courts at the place where our business is located have jurisdiction.
      </p>
    </PolicyPage>
  );
}
