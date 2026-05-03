"use client";

import type { BulkPrice } from "@/lib/types";

interface BulkPricingSelectorProps {
  bulkPrices: BulkPrice[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  unitsPerBox: number;
  baseUnitPrice: number;
}

export default function BulkPricingSelector({
  bulkPrices,
  selectedIndex,
  onSelect,
  unitsPerBox,
  baseUnitPrice,
}: BulkPricingSelectorProps) {
  if (!bulkPrices || bulkPrices.length === 0) return null;

  // Calculate savings for each option
  const tiers = bulkPrices.map((bp) => {
    const totalUnits = bp.box_count * unitsPerBox;
    const baseTotal = totalUnits * baseUnitPrice;
    const discountedTotal = totalUnits * bp.price_per_unit;
    const savings = baseTotal - discountedTotal;
    return { ...bp, totalUnits, savings: Math.round(savings) };
  });

  // Best value = highest savings
  const bestIdx = tiers.reduce(
    (best, t, idx) => (t.savings > tiers[best].savings ? idx : best),
    0
  );
  const hasBestValue = tiers[bestIdx].savings > 0;

  return (
    <div className="bulk-pricing-selector">
      <p className="bulk-pricing-label">
        <svg className="bulk-pricing-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
        </svg>
        Box Pricing
      </p>
      <div className="bulk-pricing-cards">
        {tiers.map((tier, index) => {
          const isSelected = index === selectedIndex;
          const isBest = hasBestValue && index === bestIdx && tiers.length > 1;

          return (
            <button
              key={tier.id || index}
              type="button"
              onClick={() => onSelect(index)}
              className={`bulk-tier-card ${isSelected ? "bulk-tier-selected" : ""} ${isBest ? "bulk-tier-best" : ""}`}
            >
              {isBest && <span className="bulk-best-badge">{tier.tag || "Best Value"}</span>}
              {!isBest && tier.tag && <span className="bulk-label-badge">{tier.tag}</span>}
              <span className="bulk-tier-qty">{tier.box_count} Box</span>
              <span className="bulk-tier-units">{tier.totalUnits} units</span>
              <span className="bulk-tier-price">₹{tier.price_per_unit}</span>
              <span className="bulk-tier-each">/ unit</span>
              {tier.savings > 0 && (
                <span className="bulk-tier-savings">Save ₹{tier.savings}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
