"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t border-card-border bg-card-bg/50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 8.25 4.035c.17-.066.342-.12.517-.163A7.448 7.448 0 0 0 12 3Z"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground">NCK Agro</span>
          </div>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} NCK Agro. {t("footer_rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
