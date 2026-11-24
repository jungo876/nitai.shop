"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import AdminSidebarDrawer from "@/components/AdminSidebarDrawer";

export default function MobileHeader() {
  const { count: cartCount } = useCart();

  return (
    <header className="sticky top-0 z-50 md:hidden bg-card-bg/95 backdrop-blur-xl border-b border-card-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm transition-transform group-active:scale-95">
            <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 8.25 4.035c.17-.066.342-.12.517-.163A7.448 7.448 0 0 0 12 3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 6.5a3.5 3.5 0 1 0-3 6.268" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold leading-tight bg-primary bg-clip-text text-transparent">
              NCK Agro
            </span>
            <span className="text-[9px] font-medium text-muted leading-none tracking-wider uppercase">
              Pesticide Solutions
            </span>
          </div>
        </Link>

        {/* Right: Support + Cart */}
        <div className="flex items-center gap-1">
          {/* Support */}
          <Link
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "918170947914"}?text=${encodeURIComponent("Hi, I need help with my order.")}`}
            target="_blank"
            className="flex items-center justify-center h-10 w-10 rounded-xl text-muted hover:text-primary hover:bg-primary-light active:scale-95 transition-all"
            aria-label="Support"
          >
            <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          </Link>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex items-center justify-center h-10 w-10 rounded-xl text-muted hover:text-primary hover:bg-primary-light active:scale-95 transition-all"
            aria-label="Cart"
          >
            <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          {/* Admin Drawer (Right of Cart) */}
          <AdminSidebarDrawer />
        </div>
      </div>
    </header>
  );
}
