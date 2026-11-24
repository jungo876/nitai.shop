"use client";

export default function ReviewsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Reviews</h1>
          <p className="text-sm text-muted mt-1">Moderate and respond to product reviews.</p>
        </div>
      </div>
      
      <div className="rounded-2xl border border-dashed border-card-border bg-surface p-12 text-center">
        <p className="text-muted text-sm">Review management interface will be displayed here.</p>
      </div>
    </div>
  );
}
