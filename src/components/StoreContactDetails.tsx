"use client";

import { useStoreSettings, whatsappLink } from "@/context/SettingsContext";
import { formatIndianMobile } from "@/lib/phone";

/** Business name, address, phone, WhatsApp and email, as set in Admin → Settings. */
export function StoreContactDetails() {
  const s = useStoreSettings();
  const wa = whatsappLink(s.whatsapp_number, "Hi, I have a question.");
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs text-muted">Business</dt>
        <dd className="font-semibold text-foreground">{s.store_name}</dd>
      </div>
      {s.business_address && (
        <div>
          <dt className="text-xs text-muted">Address</dt>
          <dd className="text-foreground whitespace-pre-line">{s.business_address}</dd>
        </div>
      )}
      {s.support_phone && (
        <div>
          <dt className="text-xs text-muted">Phone</dt>
          <dd><a href={`tel:+91${s.support_phone}`} className="font-semibold text-primary hover:underline">{formatIndianMobile(s.support_phone)}</a></dd>
        </div>
      )}
      {wa && (
        <div>
          <dt className="text-xs text-muted">WhatsApp</dt>
          <dd><a href={wa} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{formatIndianMobile(s.whatsapp_number ?? "")}</a></dd>
        </div>
      )}
      {s.support_email && (
        <div>
          <dt className="text-xs text-muted">Email</dt>
          <dd><a href={`mailto:${s.support_email}`} className="font-semibold text-primary hover:underline break-all">{s.support_email}</a></dd>
        </div>
      )}
    </dl>
  );
}
