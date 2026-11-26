"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const tabs = [
  {
    key: "home",
    label: "Home",
    href: "/",
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689ZM12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625A1.875 1.875 0 0 1 3.75 19.875v-6.198a1.8 1.8 0 0 0 .091-.086L12 5.432Z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        )}
      </svg>
    ),
  },
  {
    key: "store",
    label: "Store",
    href: "/store",
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path d="M5.223 2.25h13.554a.75.75 0 0 1 .736.607l1.19 5.96a3.002 3.002 0 0 1-2.399 3.539 2.99 2.99 0 0 1-2.554-.6 2.99 2.99 0 0 1-3.75 0 2.99 2.99 0 0 1-3.75 0 2.99 2.99 0 0 1-2.554.6A3.002 3.002 0 0 1 3.297 8.817l1.19-5.96a.75.75 0 0 1 .736-.607ZM3.75 14.25v6a2.25 2.25 0 0 0 2.25 2.25h12a2.25 2.25 0 0 0 2.25-2.25v-6M9 18.75h6" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
        )}
      </svg>
    ),
  },
  {
    key: "offers",
    label: "Offers",
    href: "/offers",
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path fillRule="evenodd" d="M5.25 2.25a3 3 0 0 0-3 3v4.318a3 3 0 0 0 .879 2.121l9.58 9.581c.92.92 2.39 1.186 3.548.428a18.849 18.849 0 0 0 5.441-5.44c.758-1.16.492-2.629-.428-3.548l-9.58-9.581a3 3 0 0 0-2.122-.879H5.25ZM6.375 7.5a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z" clipRule="evenodd" />
        ) : (
          <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
          </>
        )}
      </svg>
    ),
  },
  {
    key: "account",
    label: "Account",
    href: "/account",
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        )}
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { requireAuth, isLoggedIn } = useAuth();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function handleTab(e: React.MouseEvent, tab: typeof tabs[number]) {
    if (tab.key === "account" && !isLoggedIn) {
      e.preventDefault();
      requireAuth({ type: "cart" });
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card-bg/95 backdrop-blur-xl border-t border-card-border">
      <div className="flex items-stretch justify-around h-[60px]">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              onClick={(e) => handleTab(e, tab)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-w-[64px] transition-colors duration-200 active:scale-95 ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-semibold leading-tight ${active ? "text-primary" : "text-muted"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for iPhone home indicator */}
      <div className="h-[env(safe-area-inset-bottom,0px)] bg-card-bg" />
    </nav>
  );
}
