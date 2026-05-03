"use client";

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import { CATEGORIES } from "@/lib/types";
import type { ProductWithVariants, Company } from "@/lib/types";
import Link from "next/link";

interface BulkRow { box_count: string; price_per_unit: string; tag: string; }
interface VariantRow { label: string; unit_price: string; units_per_box: string; bulk_prices: BulkRow[]; }

const emptyBulk = (): BulkRow => ({ box_count: "", price_per_unit: "", tag: "" });
const emptyVariant = (): VariantRow => ({ label: "", unit_price: "", units_per_box: "1", bulk_prices: [emptyBulk()] });

export default function AdminPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [pw, setPw] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [authLoad, setAuthLoad] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImg, setExistingImg] = useState("");
  const [isTopSelling, setIsTopSelling] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>([emptyVariant()]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);
  const [prodLoad, setProdLoad] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Company state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [newCompName, setNewCompName] = useState("");
  const [newCompLogoFile, setNewCompLogoFile] = useState<File | null>(null);
  const [newCompLogoPreview, setNewCompLogoPreview] = useState<string | null>(null);
  const compFileRef = useRef<HTMLInputElement>(null);
  
  const [compLoading, setCompLoading] = useState(false);
  const [selectedManageCompId, setSelectedManageCompId] = useState<string>("");
  const [delCompConfirm, setDelCompConfirm] = useState<string | null>(null);

  async function fetchProducts() {
    setProdLoad(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) setProducts(await res.json());
    } catch { /* ignore */ } finally { setProdLoad(false); }
  }

  async function fetchCompanies() {
    try { const r = await fetch("/api/companies"); if (r.ok) setCompanies(await r.json()); } catch {}
  }

  useEffect(() => { if (isAuth) { fetchProducts(); fetchCompanies(); } }, [isAuth]);

  function handleCompImg(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setNewCompLogoFile(f); const r = new FileReader(); r.onloadend = () => setNewCompLogoPreview(r.result as string); r.readAsDataURL(f); }
  }

  async function handleAddCompany(e: FormEvent) {
    e.preventDefault(); if (!newCompName.trim()) return; setCompLoading(true);
    try {
      let logoUrl = "";
      if (newCompLogoFile) {
        const fd = new FormData(); fd.append("file", newCompLogoFile);
        const ur = await fetch("/api/upload", { method: "POST", body: fd });
        if (!ur.ok) throw new Error("Logo upload failed");
        logoUrl = (await ur.json()).url;
      }
      
      const r = await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCompName, logo_url: logoUrl }) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      
      setNewCompName(""); setNewCompLogoFile(null); setNewCompLogoPreview(null);
      if (compFileRef.current) compFileRef.current.value = "";
      
      fetchCompanies();
      setMsg({ type: "success", text: "Company added!" });
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed" }); }
    finally { setCompLoading(false); }
  }

  async function handleDeleteCompany(id: string) {
    try {
      const r = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setCompanies(prev => prev.filter(c => c.id !== id)); setDelCompConfirm(null);
      if (companyId === id) setCompanyId("");
      if (selectedManageCompId === id) setSelectedManageCompId("");
      setMsg({ type: "success", text: "Company deleted!" });
    } catch { setMsg({ type: "error", text: "Failed to delete company" }); }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault(); setAuthLoad(true); setAuthErr("");
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Login failed"); }
      setIsAuth(true);
    } catch (err) { setAuthErr(err instanceof Error ? err.message : "Login failed"); }
    finally { setAuthLoad(false); }
  }

  function handleImg(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setImageFile(f); const r = new FileReader(); r.onloadend = () => setImagePreview(r.result as string); r.readAsDataURL(f); }
  }

  function resetForm() {
    setName(""); setCategory(CATEGORIES[0]); setDescription("");
    setImageFile(null); setImagePreview(null); setExistingImg("");
    setIsTopSelling(false);
    setVariants([emptyVariant()]); setEditingId(null); setCompanyId("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function startEdit(p: ProductWithVariants) {
    setEditingId(p.id); setName(p.name); setCategory(p.category);
    setDescription(p.description); setExistingImg(p.image_url || "");
    setCompanyId(p.company_id || "");
    setIsTopSelling(p.is_top_selling || false);
    setImageFile(null); setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
    if (p.product_variants?.length) {
      setVariants(p.product_variants.map(v => ({
        label: v.label, unit_price: String(v.unit_price), units_per_box: String(v.units_per_box),
        bulk_prices: v.bulk_prices?.length
          ? v.bulk_prices.map(b => ({ box_count: String(b.box_count), price_per_unit: String(b.price_per_unit), tag: b.tag || "" }))
          : [emptyBulk()],
      })));
    } else { setVariants([emptyVariant()]); }
    setMsg(null); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProducts(prev => prev.filter(p => p.id !== id));
      setMsg({ type: "success", text: "Product deleted!" });
      if (editingId === id) resetForm();
      setDelConfirm(null);
    } catch { setMsg({ type: "error", text: "Failed to delete" }); }
  }

  // Variant helpers
  function addVariant() { setVariants(p => [...p, emptyVariant()]); }
  function removeVariant(i: number) { setVariants(p => p.filter((_, idx) => idx !== i)); }
  function updateVariant(i: number, field: keyof Omit<VariantRow, "bulk_prices">, val: string) {
    setVariants(p => p.map((v, idx) => idx === i ? { ...v, [field]: val } : v));
  }
  function addBulk(vi: number) {
    setVariants(p => p.map((v, idx) => idx === vi ? { ...v, bulk_prices: [...v.bulk_prices, emptyBulk()] } : v));
  }
  function removeBulk(vi: number, bi: number) {
    setVariants(p => p.map((v, idx) => idx === vi ? { ...v, bulk_prices: v.bulk_prices.filter((_, j) => j !== bi) } : v));
  }
  function updateBulk(vi: number, bi: number, field: keyof BulkRow, val: string) {
    setVariants(p => p.map((v, idx) => idx === vi ? { ...v, bulk_prices: v.bulk_prices.map((b, j) => j === bi ? { ...b, [field]: val } : b) } : v));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setMsg(null);
    try {
      let imgUrl = existingImg;
      if (imageFile) {
        const fd = new FormData(); fd.append("file", imageFile);
        const ur = await fetch("/api/upload", { method: "POST", body: fd });
        if (!ur.ok) throw new Error("Image upload failed");
        imgUrl = (await ur.json()).url;
      }
      const varData = variants.filter(v => v.label && v.unit_price).map(v => ({
        label: v.label, unit_price: parseFloat(v.unit_price) || 0, units_per_box: parseInt(v.units_per_box) || 1,
        bulk_prices: v.bulk_prices.filter(b => b.box_count && b.price_per_unit).map(b => ({
          box_count: parseInt(b.box_count), price_per_unit: parseFloat(b.price_per_unit), tag: b.tag || null,
        })),
      }));
      const payload = { name, category, description, image_url: imgUrl, company_id: companyId || null, is_top_selling: isTopSelling, variants: varData };
      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(editingId ? "Update failed" : "Create failed");
      setMsg({ type: "success", text: editingId ? `"${name}" updated!` : `"${name}" added!` });
      resetForm(); fetchProducts();
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Something went wrong" }); }
    finally { setLoading(false); }
  }

  const ic = "w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";
  const sic = "rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-primary";

  if (!isAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gradient-start to-gradient-end shadow-lg">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
            <p className="mt-1 text-sm text-muted">Enter the admin password</p>
          </div>
          <form onSubmit={handleLogin} className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm">
            {authErr && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">⚠ {authErr}</div>}
            <div className="mb-4">
              <label htmlFor="admin-pw" className="block text-sm font-semibold text-foreground mb-2">Password</label>
              <input id="admin-pw" type="password" value={pw} onChange={e => setPw(e.target.value)} required placeholder="Enter admin password" className={ic} />
            </div>
            <button type="submit" disabled={authLoad} className="w-full rounded-xl bg-gradient-to-r from-gradient-start to-gradient-end px-6 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50 transition-all">{authLoad ? "Verifying..." : "Login"}</button>
          </form>
          <div className="mt-4 text-center"><Link href="/" className="text-sm text-muted hover:text-primary transition-colors">← Back to website</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 border-b border-card-border bg-background/90 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex flex-col sm:flex-row max-w-5xl items-center justify-between px-4 py-3 sm:px-6 gap-3 sm:gap-6">
          <div className="flex items-center justify-between w-full sm:w-auto shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gradient-start to-gradient-end shadow-sm">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
              </div>
              <span className="font-bold text-foreground text-lg hidden sm:block">Admin Panel</span>
            </div>
            {/* Mobile Actions */}
            <div className="flex items-center gap-3 sm:hidden">
              <Link href="/" className="text-sm text-muted hover:text-primary transition-colors">Website</Link>
              <button onClick={() => setIsAuth(false)} className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-muted hover:text-danger hover:border-danger/30 transition-colors">Logout</button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="block w-full rounded-full border border-card-border bg-surface py-2 pl-10 pr-10 text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted hover:text-foreground">
                ✕
              </button>
            )}
          </div>

          {/* Desktop Actions */}
          <div className="items-center gap-4 hidden sm:flex shrink-0">
            <Link href="/" className="text-sm font-medium text-muted hover:text-primary transition-colors">← Website</Link>
            <button onClick={() => setIsAuth(false)} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-muted hover:text-danger hover:border-danger/30 hover:bg-danger/5 transition-all">Logout</button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* ═══ COMPANY MANAGEMENT ═══ */}
        <div id="manage-companies" className="mb-12 scroll-mt-20">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Companies</h1>
            <p className="mt-2 text-muted">Add or remove companies before creating products.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Add Company */}
            <div className="rounded-2xl border border-card-border bg-card-bg p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-foreground mb-6">Add New Company</h2>
              <form onSubmit={handleAddCompany} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Company Name <span className="text-danger">*</span></label>
                  <input type="text" value={newCompName} onChange={e => setNewCompName(e.target.value)} required placeholder="e.g. Bayer" className={ic} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Company Logo</label>
                  <div className="flex items-center gap-4">
                    {newCompLogoPreview ? (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-card-border bg-surface">
                        <img src={newCompLogoPreview} alt="Logo" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => { setNewCompLogoFile(null); setNewCompLogoPreview(null); if (compFileRef.current) compFileRef.current.value = ""; }} className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 hover:opacity-100 transition-opacity">✕</button>
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-card-border bg-surface text-muted cursor-pointer hover:border-primary/50 transition-colors" onClick={() => compFileRef.current?.click()}>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </div>
                    )}
                    <input type="file" ref={compFileRef} onChange={handleCompImg} accept="image/*" className="hidden" />
                    <button type="button" onClick={() => compFileRef.current?.click()} className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-muted hover:text-primary transition-colors">
                      {newCompLogoFile ? "Change Logo" : "Upload Logo"}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={compLoading} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors mt-2">
                  {compLoading ? "Adding..." : "Add Company"}
                </button>
              </form>
            </div>
            
            {/* Company List */}
            <div className="rounded-2xl border border-card-border bg-card-bg p-6 sm:p-8 shadow-sm flex flex-col md:max-h-[400px]">
              <h2 className="text-lg font-bold text-foreground mb-6">Company List</h2>
              
              {companies.length === 0 ? (
                <p className="text-sm text-muted text-center py-8 bg-surface rounded-xl border border-dashed border-card-border">No companies available.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Select to Manage</label>
                    <select value={selectedManageCompId} onChange={e => { setSelectedManageCompId(e.target.value); setDelCompConfirm(null); }} className={`${ic} appearance-none cursor-pointer`}>
                      <option value="" disabled>Select a company</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  {selectedManageCompId && (() => {
                    const c = companies.find(x => x.id === selectedManageCompId);
                    if (!c) return null;
                    return (
                      <div className="flex items-center gap-4 rounded-xl border border-card-border bg-surface p-4 mt-2">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="h-12 w-12 rounded-lg object-contain bg-white shadow-sm p-1 shrink-0" />
                        ) : (
                          <div className="h-12 w-12 shrink-0 rounded-lg bg-card-border flex items-center justify-center text-lg font-bold text-muted">{c.name.charAt(0)}</div>
                        )}
                        <span className="flex-1 font-semibold text-foreground text-lg truncate">{c.name}</span>
                        
                        {delCompConfirm === c.id ? (
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleDeleteCompany(c.id)} className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-danger/90">Confirm Delete</button>
                            <button onClick={() => setDelCompConfirm(null)} className="rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDelCompConfirm(c.id)} className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium border border-danger/30 text-danger hover:bg-danger/10 transition-colors">
                            Delete
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ PRODUCT MANAGEMENT ═══ */}
        <div className="mb-8 border-t border-card-border pt-12">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{editingId ? "Edit Product" : "Add New Product"}</h1>
          <p className="mt-2 text-muted">{editingId ? "Update product details below." : "Fill in details to add a product."}</p>
        </div>

        {msg && (
          <div className={`mb-6 flex items-center gap-3 rounded-xl border px-5 py-4 text-sm font-medium animate-fade-in-up ${msg.type === "success" ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400" : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"}`}>
            {msg.type === "success" ? "✓" : "⚠"} {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl border border-card-border bg-card-bg p-6 sm:p-8 shadow-sm">
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="pn" className="block text-sm font-semibold text-foreground mb-2">Product Name <span className="text-danger">*</span></label>
              <input id="pn" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Chlorpyrifos 20% EC" className={ic} />
            </div>
            {/* Category */}
            <div>
              <label htmlFor="pc" className="block text-sm font-semibold text-foreground mb-2">Category <span className="text-danger">*</span></label>
              <select id="pc" value={category} onChange={e => setCategory(e.target.value)} required className={`${ic} appearance-none cursor-pointer`}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Company */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="pco" className="block text-sm font-semibold text-foreground">Company</label>
                <a href="#manage-companies" className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Add New Company
                </a>
              </div>
              <select id="pco" value={companyId} onChange={e => setCompanyId(e.target.value)} className={`${ic} appearance-none cursor-pointer`}>
                <option value="" disabled>Select Company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            {/* Top Selling Toggle */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-card-border bg-surface">
              <input type="checkbox" id="top-selling" checked={isTopSelling} onChange={e => setIsTopSelling(e.target.checked)} className="h-5 w-5 rounded border-card-border text-primary focus:ring-primary cursor-pointer accent-primary" />
              <label htmlFor="top-selling" className="text-sm font-semibold text-foreground cursor-pointer select-none">Mark as Top Selling</label>
            </div>
            {/* Description */}
            <div>
              <label htmlFor="pd" className="block text-sm font-semibold text-foreground mb-2">Description <span className="text-danger">*</span></label>
              <textarea id="pd" value={description} onChange={e => setDescription(e.target.value)} required rows={3} placeholder="Short description..." className={`${ic} resize-none`} />
            </div>
            {/* Image */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Product Image</label>
              <div className={`relative rounded-xl border-2 border-dashed transition-all ${imagePreview || existingImg ? "border-primary bg-primary-light/30" : "border-card-border hover:border-primary/50"}`}>
                {(imagePreview || existingImg) ? (
                  <div className="relative p-4">
                    <img src={imagePreview || existingImg} alt="Preview" className="mx-auto max-h-48 rounded-lg object-contain" />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setExistingImg(""); if (fileRef.current) fileRef.current.value = ""; }}
                      className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-card-bg border border-card-border text-muted hover:text-danger transition-colors">✕</button>
                  </div>
                ) : (
                  <label htmlFor="pi" className="flex flex-col items-center justify-center px-6 py-10 cursor-pointer">
                    <svg className="h-8 w-8 text-muted/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                    <span className="text-sm font-medium text-muted">Click to upload</span>
                  </label>
                )}
                <input id="pi" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImg} className="sr-only" />
              </div>
            </div>

            {/* ═══ VARIANTS ═══ */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-foreground">Product Variants <span className="text-danger">*</span></label>
                <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">+ Add Variant</button>
              </div>

              <div className="space-y-4">
                {variants.map((v, vi) => (
                  <div key={vi} className="rounded-xl border border-card-border bg-surface/50 p-4">
                    {/* Variant header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">Variant {vi + 1}</span>
                      {variants.length > 1 && (
                        <button type="button" onClick={() => removeVariant(vi)} className="text-xs text-muted hover:text-danger transition-colors">Remove</button>
                      )}
                    </div>
                    {/* Variant fields */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <input type="text" value={v.label} onChange={e => updateVariant(vi, "label", e.target.value)} placeholder="Label (1 LTR)" className={sic} />
                      <input type="number" step="0.01" value={v.unit_price} onChange={e => updateVariant(vi, "unit_price", e.target.value)} placeholder="Unit Price (₹)" className={sic} />
                      <input type="number" value={v.units_per_box} onChange={e => updateVariant(vi, "units_per_box", e.target.value)} placeholder="Units/Box" className={sic} />
                    </div>
                    {/* Bulk prices for this variant */}
                    <div className="ml-2 border-l-2 border-card-border pl-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted">Bulk Pricing</span>
                        <button type="button" onClick={() => addBulk(vi)} className="text-xs text-primary hover:underline">+ Add Tier</button>
                      </div>
                      {v.bulk_prices.map((b, bi) => (
                        <div key={bi} className="flex items-center gap-2 mb-2">
                          <input type="number" value={b.box_count} onChange={e => updateBulk(vi, bi, "box_count", e.target.value)} placeholder="Boxes" className={`${sic} w-20`} />
                          <input type="number" step="0.01" value={b.price_per_unit} onChange={e => updateBulk(vi, bi, "price_per_unit", e.target.value)} placeholder="₹/unit" className={`${sic} w-24`} />
                          <input type="text" value={b.tag} onChange={e => updateBulk(vi, bi, "tag", e.target.value)} placeholder="Tag (opt)" className={`${sic} flex-1`} />
                          {v.bulk_prices.length > 1 && (
                            <button type="button" onClick={() => removeBulk(vi, bi)} className="text-muted hover:text-danger text-sm">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gradient-start to-gradient-end px-8 py-3.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50 transition-all hover:-translate-y-0.5">
              {loading ? "Saving..." : editingId ? "Update Product" : "+ Add Product"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-xl border border-card-border px-6 py-3.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface transition-all">
              {editingId ? "Cancel" : "Reset"}
            </button>
          </div>
        </form>

        {/* Products List */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">
              All Products ({products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()) || p.companies?.name.toLowerCase().includes(searchQuery.toLowerCase())).length}{searchQuery && ` / ${products.length}`})
            </h2>
          </div>

          {prodLoad ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-shimmer" />)}</div>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center bg-surface rounded-xl border border-dashed border-card-border">No products yet. Add one above!</p>
          ) : (
            <div className="space-y-3">
              {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()) || p.companies?.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <p className="text-sm text-muted py-8 text-center bg-surface rounded-xl border border-dashed border-card-border">No products matching your search.</p>
              ) : (
                products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()) || p.companies?.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                <div key={p.id} className="flex items-center gap-4 rounded-xl border border-card-border bg-card-bg p-4">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface text-muted/30 shrink-0">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{p.name}</p>
                      {p.is_top_selling && <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">🔥 Top Selling</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{p.category}</span>
                      {p.companies && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">{p.companies.name}</span>}
                      {p.product_variants?.map(v => (
                        <span key={v.id} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          {v.label} · ₹{v.unit_price}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => startEdit(p)} className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-muted hover:text-primary hover:border-primary/30 transition-colors">Edit</button>
                    {delConfirm === p.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(p.id)} className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white">Confirm</button>
                        <button onClick={() => setDelConfirm(null)} className="rounded-lg border border-card-border px-2 py-1.5 text-xs text-muted">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setDelConfirm(p.id)} className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-muted hover:text-danger hover:border-danger/30 transition-colors">Delete</button>
                    )}
                  </div>
                </div>
              ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
