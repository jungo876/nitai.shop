"use client";

import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { CATEGORIES } from "@/lib/types";
import type { Product } from "@/lib/types";
import Link from "next/link";

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  function resetForm() {
    setName("");
    setCategory(CATEGORIES[0]);
    setDescription("");
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let imageUrl = "";

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || "Image upload failed");
        }
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const productRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, description, image_url: imageUrl }),
      });

      if (!productRes.ok) {
        const errData = await productRes.json();
        throw new Error(errData.error || "Failed to create product");
      }

      const newProduct = await productRes.json();
      setRecentProducts((prev) => [newProduct, ...prev]);
      setMessage({ type: "success", text: `"${name}" added successfully!` });
      resetForm();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  // ─── Login Gate ──────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gradient-start to-gradient-end shadow-lg">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
            <p className="mt-1 text-sm text-muted">Enter the admin password to continue</p>
          </div>

          <form onSubmit={handleLogin} className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm">
            {authError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                {authError}
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="admin-password" className="block text-sm font-semibold text-foreground mb-2">Password</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter admin password"
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-xl bg-gradient-to-r from-gradient-start to-gradient-end px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:shadow-xl disabled:opacity-50 transition-all"
            >
              {authLoading ? "Verifying..." : "Login"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-muted hover:text-primary transition-colors">← Back to website</Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Admin Panel (after login) ──────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gradient-start to-gradient-end">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </div>
            <span className="font-bold text-foreground">NCK Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-muted hover:text-primary transition-colors">← Website</Link>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-muted hover:text-danger hover:border-danger/30 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Add New Product</h1>
          <p className="mt-2 text-muted">Fill in the details below to add a new product to the catalog.</p>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`mb-6 flex items-center gap-3 rounded-xl border px-5 py-4 text-sm font-medium animate-fade-in-up ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          }`}>
            {message.type === "success" ? "✓" : "⚠"} {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-card-border bg-card-bg p-6 sm:p-8 shadow-sm">
          <div className="space-y-6">
            <div>
              <label htmlFor="product-name" className="block text-sm font-semibold text-foreground mb-2">
                Product Name <span className="text-danger">*</span>
              </label>
              <input id="product-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="e.g. Chlorpyrifos 20% EC"
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>

            <div>
              <label htmlFor="product-category" className="block text-sm font-semibold text-foreground mb-2">
                Category <span className="text-danger">*</span>
              </label>
              <select id="product-category" value={category} onChange={(e) => setCategory(e.target.value)} required
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer">
                {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>

            <div>
              <label htmlFor="product-description" className="block text-sm font-semibold text-foreground mb-2">
                Description <span className="text-danger">*</span>
              </label>
              <textarea id="product-description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={4}
                placeholder="Write a short description of the product..."
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Product Image</label>
              <div className={`relative rounded-xl border-2 border-dashed transition-all ${
                imagePreview ? "border-primary bg-primary-light/30" : "border-card-border hover:border-primary/50 hover:bg-surface/50"
              }`}>
                {imagePreview ? (
                  <div className="relative p-4">
                    <img src={imagePreview} alt="Preview" className="mx-auto max-h-64 rounded-lg object-contain" />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-card-bg border border-card-border shadow-sm text-muted hover:text-danger transition-colors">
                      ✕
                    </button>
                  </div>
                ) : (
                  <label htmlFor="product-image" className="flex flex-col items-center justify-center px-6 py-12 cursor-pointer">
                    <svg className="h-10 w-10 text-muted/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <span className="text-sm font-medium text-muted">Click to upload an image</span>
                    <span className="mt-1 text-xs text-muted/60">JPEG, PNG, WebP, GIF — Max 5MB</span>
                  </label>
                )}
                <input id="product-image" ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="sr-only" />
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gradient-start to-gradient-end px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:shadow-xl disabled:opacity-50 transition-all duration-300 hover:-translate-y-0.5">
              {loading ? "Saving..." : "+ Add Product"}
            </button>
            <button type="button" onClick={resetForm}
              className="rounded-xl border border-card-border px-6 py-3.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface transition-all">
              Reset
            </button>
          </div>
        </form>

        {/* Recently Added */}
        {recentProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-foreground mb-4">Recently Added</h2>
            <div className="space-y-3">
              {recentProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-4 rounded-xl border border-card-border bg-card-bg p-4 animate-fade-in-up">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface text-muted/30">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted">{product.category}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                    Added ✓
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
