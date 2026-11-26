import type { Metadata } from "next";
import Link from "next/link";
import { StoreContactDetails } from "@/components/StoreContactDetails";
import { POLICY_LINKS } from "@/lib/policies";

export const metadata: Metadata = { title: "Contact us — NCK Agro" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Link href="/" className="text-sm font-medium text-muted hover:text-foreground">← Home</Link>
      <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Contact us</h1>
      <p className="mt-2 text-sm text-muted">
        For orders, prices, bulk enquiries or help with a delivery, call or message us. Please keep your order number ready.
      </p>
      <section className="mt-6 rounded-2xl border border-card-border bg-card-bg p-5">
        <StoreContactDetails />
      </section>
      <p className="mt-4 text-xs text-muted">We usually reply on working days between 10 am and 7 pm.</p>
      <nav aria-label="Policies" className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {POLICY_LINKS.filter((l) => l.href !== "/contact").map((l) => (
          <Link key={l.href} href={l.href} className="font-medium text-muted hover:text-foreground">{l.label}</Link>
        ))}
      </nav>
    </div>
  );
}
