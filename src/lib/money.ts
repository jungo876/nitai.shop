/**
 * Money helpers. All payment maths is done in integer paise so that totals,
 * advances and Razorpay amounts are exact (no 0.1 + 0.2 problems).
 */

export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) throw new Error("Invalid amount");
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

/** Advance payable now for a COD order, in paise (rounded to the nearest paisa). */
export function advancePaise(totalPaise: number, percent: number): number {
  if (percent <= 0) return 0;
  if (percent >= 100) return totalPaise;
  return Math.round((totalPaise * percent) / 100);
}

/** "₹1,23,456" or "₹1,234.50" (Indian digit grouping). */
export function formatINR(rupees: number | null | undefined): string {
  const value = Number(rupees ?? 0);
  const hasPaise = Math.round(value * 100) % 100 !== 0;
  return "₹" + value.toLocaleString("en-IN", { minimumFractionDigits: hasPaise ? 2 : 0, maximumFractionDigits: 2 });
}
