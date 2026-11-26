import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Privacy Policy — NCK Agro" };

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy" updated="26 November 2026">
      <p>
        This policy explains what personal information NCK Agro collects, why, and what you can do about it. We follow the
        Digital Personal Data Protection Act, 2023.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Your mobile number (to log you in with a one-time code) and, if you give it, your WhatsApp number.</li>
        <li>Your name, shop / business name, business type, and GST and PAN numbers if you provide them.</li>
        <li>Your delivery address.</li>
        <li>Your orders, cart and wishlist.</li>
        <li>
          Basic technical data needed to keep the service secure, such as your IP address and browser type at login, and records
          of login attempts (used to stop abuse).
        </li>
      </ul>
      <p>
        We do <strong>not</strong> collect or store card numbers, UPI PINs or bank passwords — payments are handled entirely by Razorpay.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>To create your account and log you in.</li>
        <li>To process, deliver and support your orders, and to issue bills.</li>
        <li>To contact you about your orders (by phone, SMS or WhatsApp).</li>
        <li>To prevent fraud and keep the website secure.</li>
        <li>To meet legal and tax obligations.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>Only with the services needed to run the store, and only what they need:</p>
      <ul>
        <li>Razorpay — to take payments.</li>
        <li>Our SMS provider — to send login codes.</li>
        <li>Courier / transport partners — your name, phone and address, to deliver orders.</li>
        <li>Our hosting and database providers, who store data on our behalf.</li>
        <li>Government authorities, when the law requires it.</li>
      </ul>
      <p>We never sell your personal information or share it for advertising.</p>

      <h2>Cookies</h2>
      <p>
        We use one essential cookie to keep you logged in. We do not use advertising or third-party tracking cookies. Razorpay may
        set its own cookies inside the payment window.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account while it is active. Order and billing records are kept for as long as tax and accounting law requires
        (usually 8 years). Login codes expire within minutes and are deleted regularly.
      </p>

      <h2>Your rights</h2>
      <p>
        You can see and correct most of your details on your Account page. To get a copy of your data, correct something else,
        withdraw consent or delete your account, contact us using the details below. We will reply within 30 days. Records we must
        keep by law (such as invoices) cannot be deleted before the legal period ends.
      </p>

      <h2>Security</h2>
      <p>
        Data is sent over encrypted connections (HTTPS), access to the database is restricted, and login sessions are protected.
        No system is perfectly secure; if a breach affects you, we will tell you as the law requires.
      </p>

      <h2>Grievances</h2>
      <p>For any privacy question or complaint, contact us using the details below.</p>
    </PolicyPage>
  );
}
