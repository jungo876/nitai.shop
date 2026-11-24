"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  redirect_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminBannersPage() {
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const isAuth = isLoggedIn && user?.is_admin === true;

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImg, setExistingImg] = useState("");

  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchBanners() {
    setLoading(true);
    try {
      const res = await fetch("/api/banners?all=true");
      if (res.ok) {
        setBanners(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuth) fetchBanners();
  }, [isAuth]);

  function handleImage(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 2 * 1024 * 1024) {
        setMsg({ type: "error", text: "File size exceeds 2MB limit" });
        return;
      }
      setImageFile(f);
      const r = new FileReader();
      r.onloadend = () => {
        const res = r.result as string;
        setImagePreview(res);
        const img = new window.Image();
        img.onload = () => {
          const ratio = img.width / img.height;
          if (Math.abs(ratio - 2.4) > 0.1) {
            setWarningMsg("This banner may be cropped on mobile devices. (Recommended ratio: 2.4:1)");
          } else {
            setWarningMsg(null);
          }
        };
        img.src = res;
      };
      r.readAsDataURL(f);
    }
  }

  function resetForm() {
    setTitle("");
    setRedirectUrl("");
    setDisplayOrder(0);
    setIsActive(true);
    setImageFile(null);
    setImagePreview(null);
    setExistingImg("");
    setEditingId(null);
    setWarningMsg(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function startEdit(b: Banner) {
    setEditingId(b.id);
    setTitle(b.title || "");
    setRedirectUrl(b.redirect_url || "");
    setDisplayOrder(b.display_order);
    setIsActive(b.is_active);
    setExistingImg(b.image_url);
    setImageFile(null);
    setImagePreview(null);
    setWarningMsg(null);
    if (fileRef.current) fileRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      let imageUrl = existingImg;

      // Upload image if new file selected
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const upRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!upRes.ok) throw new Error("Image upload failed");
        const upData = await upRes.json();
        imageUrl = upData.url;
      }

      if (!imageUrl) {
        setMsg({ type: "error", text: "Please upload a banner image" });
        setSaving(false);
        return;
      }

      const payload = {
        title: title || null,
        image_url: imageUrl,
        redirect_url: redirectUrl || null,
        display_order: displayOrder,
        is_active: isActive,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/banners/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed");
      }

      setMsg({ type: "success", text: editingId ? "Banner updated!" : "Banner added!" });
      resetForm();
      fetchBanners();
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/banners/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setBanners((prev) => prev.filter((b) => b.id !== id));
      setDelConfirm(null);
      setMsg({ type: "success", text: "Banner deleted!" });
    } catch {
      setMsg({ type: "error", text: "Failed to delete banner" });
    }
  }

  async function toggleActive(b: Banner) {
    try {
      await fetch(`/api/banners/${b.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !b.is_active }),
      });
      setBanners((prev) =>
        prev.map((x) => (x.id === b.id ? { ...x, is_active: !x.is_active } : x))
      );
    } catch {
      setMsg({ type: "error", text: "Failed to toggle status" });
    }
  }

  const ic = "w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
        {/* Status message */}
        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${msg.type === "success" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"}`}>
            {msg.text}
          </div>
        )}

        {/* ── Add / Edit Banner Form ── */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-card-border bg-card-bg p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            {editingId ? "✏️ Edit Banner" : "➕ Add New Banner"}
          </h2>

          {/* Image Upload */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-semibold text-foreground">Banner Image *</label>
              <div className="text-[11px] text-muted text-right leading-tight">
                <span className="font-semibold block">Recommended: 1200 × 500 px (2.4:1)</span>
                Formats: JPG, PNG, WEBP • Max: 2 MB
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 transition-all" />
            
            <div className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
              <span className="font-bold">Admin Note:</span> Keep logo, text and offer information inside the center 80% of the image. Avoid placing important content near image edges.
            </div>

            {warningMsg && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/50 font-medium">
                ⚠️ {warningMsg}
              </div>
            )}

            {(imagePreview || existingImg) && (
              <div className="mt-3 relative w-full rounded-xl overflow-hidden border border-card-border mx-auto" style={{ aspectRatio: "2.4 / 1", maxHeight: "180px" }}>
                <Image src={imagePreview || existingImg} alt="Preview" fill className="object-cover" sizes="600px" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Banner Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer Sale — 20% off" className={ic} />
            </div>

            {/* Redirect URL */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Redirect URL</label>
              <input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="/store or /products" className={ic} />
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Display Order</label>
              <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} className={ic} />
            </div>

            {/* Active Toggle */}
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-surface rounded-full peer-checked:bg-primary transition-colors border border-card-border" />
                  <div className="absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full shadow-sm peer-checked:translate-x-5 transition-transform" />
                </div>
                <span className="text-sm font-medium text-foreground">{isActive ? "Active" : "Inactive"}</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50 transition-all hover:shadow-md">
              {saving ? "Saving..." : editingId ? "Update Banner" : "Add Banner"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-xl border border-card-border px-6 py-3 text-sm font-medium text-muted hover:text-foreground transition-colors">
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* ── Banner List ── */}
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
            All Banners ({banners.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-card-bg border border-card-border animate-shimmer" />
              ))}
            </div>
          ) : banners.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-card-border bg-surface p-8 text-center">
              <svg className="h-10 w-10 text-muted/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
              <p className="text-sm text-muted font-medium">No banners yet</p>
              <p className="text-xs text-muted mt-1">Add your first promotional banner above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {banners.map((b) => (
                <div key={b.id} className={`rounded-2xl border bg-card-bg overflow-hidden transition-all ${b.is_active ? "border-card-border" : "border-dashed border-muted/30 opacity-60"}`}>
                  <div className="flex flex-col sm:flex-row">
                    {/* Image preview */}
                    <div className="relative h-28 sm:h-auto sm:w-48 shrink-0">
                      <Image src={b.image_url} alt={b.title || "Banner"} fill className="object-cover" sizes="200px" />
                      {!b.is_active && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <span className="text-xs font-bold text-muted uppercase tracking-wider">Inactive</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-foreground">{b.title || "Untitled Banner"}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${b.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                            {b.is_active ? "Active" : "Off"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted">
                          <span>Order: <span className="font-semibold text-foreground">{b.display_order}</span></span>
                          {b.redirect_url && <span>→ <span className="font-medium text-primary">{b.redirect_url}</span></span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <button onClick={() => toggleActive(b)} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${b.is_active ? "border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20" : "border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"}`}>
                          {b.is_active ? "Disable" : "Enable"}
                        </button>
                        <button onClick={() => startEdit(b)} className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-muted hover:text-primary hover:border-primary/30 transition-colors">
                          Edit
                        </button>
                        {delConfirm === b.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(b.id)} className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white">Confirm</button>
                            <button onClick={() => setDelConfirm(null)} className="rounded-lg border border-card-border px-2 py-1.5 text-xs text-muted">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setDelConfirm(b.id)} className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-muted hover:text-danger hover:border-danger/30 transition-colors">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
