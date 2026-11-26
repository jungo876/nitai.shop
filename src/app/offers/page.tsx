"use client";

import Link from "next/link";

export default function OffersPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center">
        {/* Icon */}
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-surface shadow-sm">
          <svg className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Offers Coming Soon
        </h1>
        <p className="text-sm text-muted max-w-sm mb-8 leading-relaxed">
          We&apos;re preparing exciting deals and bulk discounts for our B2B partners. Stay tuned for exclusive offers on pesticides, fertilizers, and more.
        </p>

        {/* Notification teaser */}
        <div className="w-full max-w-sm rounded-2xl border border-card-border bg-card-bg p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Get Notified</p>
              <p className="text-xs text-muted mt-0.5">We&apos;ll send you a WhatsApp message when offers go live.</p>
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover active:scale-95 transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Browse Products
        </Link>
      </div>
    </div>
  );
}
