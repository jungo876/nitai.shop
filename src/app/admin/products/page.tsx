"use client";

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import { CATEGORIES, HOME_CATEGORIES } from "@/lib/types";
import type { ProductWithVariants, Company, Product } from "@/lib/types";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface BulkRow { box_count: string; price_per_unit: string; tag: string; }
interface VariantRow { label: string; unit_price: string; units_per_box: string; bulk_prices: BulkRow[]; }

const emptyBulk = (): BulkRow => ({ box_count: "", price_per_unit: "", tag: "" });
const emptyVariant = (): VariantRow => ({ label: "", unit_price: "", units_per_box: "1", bulk_prices: [emptyBulk()] });

export default function AdminPage() {
  const { user, isLoggedIn, isLoading: authLoadContext, logout } = useAuth();
  const isAuth = isLoggedIn && user?.is_admin === true;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [homeCategory, setHomeCategory] = useState<string>(HOME_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImg, setExistingImg] = useState("");
  const [isTopSelling, setIsTopSelling] = useState(false);
  const [status, setStatus] = useState<Product['status']>('active');
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
      const res = await fetch("/api/products?include_hidden=true");
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

  function handleImg(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setImageFile(f); const r = new FileReader(); r.onloadend = () => setImagePreview(r.result as string); r.readAsDataURL(f); }
  }

  function resetForm() {
    setName(""); setCategory(CATEGORIES[0]); setHomeCategory(HOME_CATEGORIES[0]); setDescription("");
    setImageFile(null); setImagePreview(null); setExistingImg("");
    setIsTopSelling(false);
    setStatus('active');
    setVariants([emptyVariant()]); setEditingId(null); setCompanyId("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function startEdit(p: ProductWithVariants) {
    setEditingId(p.id); setName(p.name); setCategory(p.category);
    setHomeCategory(p.home_category || HOME_CATEGORIES[0]);
    setDescription(p.description); setExistingImg(p.image_url || "");
    setCompanyId(p.company_id || "");
    setIsTopSelling(p.is_top_selling || false);
    setStatus(p.status || 'active');
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
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      setProducts(prev => prev.filter(p => p.id !== id));
      setMsg({ type: "success", text: "Product deleted!" });
      if (editingId === id) resetForm();
      setDelConfirm(null);
    } catch (err: any) { setMsg({ type: "error", text: err.message || "Failed to delete" }); }
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
      const payload = { name, category, description, image_url: imgUrl, company_id: companyId || null, is_top_selling: isTopSelling, status, home_category: homeCategory || null, variants: varData };
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

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
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
            {/* Home Category */}
            <div>
              <label htmlFor="phc" className="block text-sm font-semibold text-foreground mb-2">Home Category <span className="text-danger">*</span></label>
              <select id="phc" value={homeCategory} onChange={e => setHomeCategory(e.target.value)} required className={`${ic} appearance-none cursor-pointer`}>
                {HOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted">Used for homepage category navigation grouping</p>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Status Dropdown */}
              <div>
                <label htmlFor="pstatus" className="block text-sm font-semibold text-foreground mb-2">Product Status</label>
                <select id="pstatus" value={status} onChange={e => setStatus(e.target.value as Product['status'])} className={`${ic} appearance-none cursor-pointer`}>
                  <option value="active">🟢 Active</option>
                  <option value="out_of_stock">🔴 Out of Stock</option>
                  <option value="coming_soon">🟡 Coming Soon</option>
                  <option value="hidden">⚫ Hidden</option>
                </select>
              </div>
              
              {/* Top Selling Toggle */}
              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-3 p-4 rounded-xl border border-card-border bg-surface h-[46px]">
                  <input type="checkbox" id="top-selling" checked={isTopSelling} onChange={e => setIsTopSelling(e.target.checked)} className="h-5 w-5 rounded border-card-border text-primary focus:ring-primary cursor-pointer accent-primary" />
                  <label htmlFor="top-selling" className="text-sm font-semibold text-foreground cursor-pointer select-none">Mark as Top Selling</label>
                </div>
              </div>
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
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50 transition-all hover:-translate-y-0.5">
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
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <p className="font-semibold text-foreground truncate max-w-[200px]">{p.name}</p>
                      {p.status === 'out_of_stock' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 whitespace-nowrap">🔴 Out of Stock</span>}
                      {p.status === 'coming_soon' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 whitespace-nowrap">🟡 Coming Soon</span>}
                      {p.status === 'hidden' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 whitespace-nowrap">⚫ Hidden</span>}
                      {p.is_top_selling && <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">🔥 Top Selling</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{p.category}</span>
                      {p.home_category && <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">{p.home_category}</span>}
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
  );
}
