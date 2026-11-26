/**
 * Indian mobile numbers are stored as their 10-digit national form
 * (e.g. "9876543210"). Accepts "+91 98765 43210", "09876543210", etc.
 * Returns null if it is not a valid Indian mobile number.
 */
export function normalizeIndianMobile(input: string | null | undefined): string | null {
  let digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** "9876543210" -> "+91 98765 43210" */
export function formatIndianMobile(phone: string | null | undefined): string {
  const p = normalizeIndianMobile(phone);
  return p ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : String(phone ?? "");
}
