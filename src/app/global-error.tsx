"use client"; // Replaces the root layout when the layout itself fails, so it styles itself.

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f9fafb", color: "#111827" }}>
        <title>Something went wrong — NCK Agro</title>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 380 }}>
            Sorry — the site could not be loaded. Please try again in a moment. If you were paying, check My Orders before paying again.
          </p>
          {digest && <p style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>Reference: {digest}</p>}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button onClick={() => retry()} style={{ background: "#16a34a", color: "#fff", border: 0, borderRadius: 12, padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}>
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the router may be broken here; use a full page load */}
            <a href="/" style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 20px", fontWeight: 600, color: "#111827", textDecoration: "none" }}>Home</a>
          </div>
        </main>
      </body>
    </html>
  );
}
