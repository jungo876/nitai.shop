"use client";

export default function CategoriesPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories & Brands</h1>
          <p className="text-sm text-muted mt-1">Manage product classification and manufacturer brands.</p>
        </div>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-all">
          + Add Category
        </button>
      </div>
      
      <div className="rounded-2xl border border-dashed border-card-border bg-surface p-12 text-center">
        <p className="text-muted text-sm">Category management interface will be displayed here.</p>
      </div>
    </div>
  );
}
