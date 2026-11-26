"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useStoreSettings } from "@/context/SettingsContext";
import { POLICY_LINKS } from "@/lib/policies";

export default function Footer() {
  const { t } = useLanguage();
  const s = useStoreSettings();

  return (
    <footer className="mt-auto border-t border-card-border bg-card-bg/50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 8.25 4.035c.17-.066.342-.12.517-.163A7.448 7.448 0 0 0 12 3Z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-foreground">{s.store_name}</span>
            </div>
            {s.business_address && <p className="mt-2 text-xs text-muted whitespace-pre-line">{s.business_address}</p>}
          </div>
          <nav aria-label="Help and policies" className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:flex sm:flex-wrap sm:gap-x-5">
            {POLICY_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="font-medium text-muted hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-6 text-xs text-muted">
          © {new Date().getFullYear()} {s.store_name}. {t("footer_rights")}
        </p>
      </div>
    </footer>
  );
}
