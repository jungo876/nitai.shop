import Link from "next/link";
import { StoreContactDetails } from "@/components/StoreContactDetails";
import { POLICY_LINKS } from "@/lib/policies";

/** Shared layout for the legal/help pages (also needed for Razorpay live-mode approval). */
export function PolicyPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Link href="/" className="text-sm font-medium text-muted hover:text-foreground">← Home</Link>
      <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
      <p className="mt-1 text-xs text-muted">Last updated: {updated}</p>
      <div className="policy mt-6 space-y-4 text-sm leading-relaxed text-foreground/90 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-primary [&_a]:font-semibold hover:[&_a]:underline">
        {children}
      </div>
      <section className="mt-10 rounded-2xl border border-card-border bg-card-bg p-5">
        <h2 className="text-sm font-bold text-foreground mb-3">Questions? Contact us</h2>
        <StoreContactDetails />
      </section>
      <nav aria-label="Policies" className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {POLICY_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="font-medium text-muted hover:text-foreground">{l.label}</Link>
        ))}
      </nav>
    </div>
  );
}
