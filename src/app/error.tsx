"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center" role="alert">
      <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        Sorry — this page could not be loaded. Please try again. If you were paying, your payment is safe: check My Orders before paying again.
      </p>
      {digest && <p className="mt-2 font-mono text-[11px] text-muted">Reference: {digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={() => retry()} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">Try again</button>
        <Link href="/" className="rounded-xl border border-card-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-surface">Home</Link>
      </div>
    </div>
  );
}
