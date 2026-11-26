import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-5xl font-extrabold text-primary">404</p>
      <h1 className="mt-3 text-xl font-bold text-foreground">Page not found</h1>
      <p className="mt-2 text-sm text-muted">The page you are looking for does not exist or has been moved. The product may no longer be listed.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">Browse products</Link>
        <Link href="/" className="rounded-xl border border-card-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-surface">Home</Link>
      </div>
    </div>
  );
}
