"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, toggleLanguage } = useLanguage();
  const { user, isLoggedIn, requireAuth, logout } = useAuth();
  const { count: cartCount } = useCart();

  // Admin page is hidden from public navigation
  const navLinks = [
    { href: "/", label: t("nav_home") },
    { href: "/#products", label: t("nav_products") },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-card-border bg-card-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gradient-start to-gradient-end shadow-md transition-transform group-hover:scale-110">
            <svg
              className="h-5 w-5 text-white"
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 6.5a3.5 3.5 0 1 0-3 6.268"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight bg-gradient-to-r from-gradient-start to-gradient-end bg-clip-text text-transparent">
              NCK Agro
            </span>
            <span className="text-[10px] font-medium text-muted leading-none tracking-wider uppercase">
              Pesticide Solutions
            </span>
          </div>
        </Link>

        {/* Desktop Links + Language Toggle + Auth */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href.replace("/#", "/"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-primary bg-primary-light"
                    : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="ml-2 flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-surface transition-all duration-200"
            aria-label="Toggle language"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
            </svg>
            {t("lang_toggle")}
          </button>

          {/* Cart Icon (Desktop) */}
          {isLoggedIn && (
            <Link
              href="/cart"
              className="ml-1 relative flex items-center justify-center h-9 w-9 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
              aria-label="Cart"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          )}

          {/* Auth Button (Desktop) */}
          {isLoggedIn ? (
            <div className="ml-2 flex items-center gap-2">
              <Link
                href="/account"
                className="flex items-center gap-1.5 rounded-lg bg-primary-light px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                {user?.name || user?.phone_number || "Account"}
              </Link>
              <button
                onClick={logout}
                className="rounded-lg border border-card-border px-3 py-2 text-xs font-medium text-muted hover:text-red-500 hover:border-red-200 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => requireAuth({ type: "cart" })}
              className="ml-2 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gradient-start to-gradient-end px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              Login
            </button>
          )}
        </div>

        {/* Mobile: Auth + Language + Menu */}
        <div className="md:hidden flex items-center gap-2">
          {/* Mobile Auth Icon */}
          {isLoggedIn ? (
            <Link
              href="/account"
              className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary-light text-primary transition-colors"
              aria-label="Account"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </Link>
          ) : (
            <button
              onClick={() => requireAuth({ type: "cart" })}
              className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-gradient-start to-gradient-end text-white shadow-sm transition-transform active:scale-95"
              aria-label="Login"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </button>
          )}

          {/* Cart Icon (Mobile) */}
          {isLoggedIn && (
            <Link
              href="/cart"
              className="relative flex items-center justify-center h-10 w-10 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
              aria-label="Cart"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          )}

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 rounded-lg border border-card-border px-2.5 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-surface transition-colors"
            aria-label="Toggle language"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
            </svg>
            {t("lang_toggle")}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex items-center justify-center h-10 w-10 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-card-border bg-card-bg/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href.replace("/#", "/"));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-primary bg-primary-light"
                      : "text-muted hover:text-foreground hover:bg-surface"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Mobile Auth Section in Dropdown */}
            <div className="border-t border-card-border mt-2 pt-2">
              {isLoggedIn ? (
                <>
                  <div className="px-4 py-2 text-xs font-medium text-muted">
                    Logged in as <span className="text-foreground font-semibold">{user?.name || user?.phone_number}</span>
                  </div>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { requireAuth({ type: "cart" }); setMobileOpen(false); }}
                  className="block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary-light transition-colors"
                >
                  Login / Sign Up
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
