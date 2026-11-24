"use client";

import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { SettingsProvider } from "@/context/SettingsContext";
import Navbar from "@/components/Navbar";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import LoginModal from "@/components/LoginModal";
import { usePathname } from "next/navigation";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  // Pages where bottom nav should be hidden (checkout, cart, product detail, order detail)
  const hideBottomNav = isAdmin || pathname === "/checkout" || pathname.startsWith("/orders/");

  return (
    <LanguageProvider>
     <SettingsProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            {!isAdmin && (
              <>
                {/* Desktop: existing Navbar */}
                <div className="hidden md:block">
                  <Navbar />
                </div>
                {/* Mobile: new sticky header */}
                <MobileHeader />
              </>
            )}

            <main className={`flex-1 ${!hideBottomNav ? "pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0" : ""}`}>
              {children}
            </main>

            {!isAdmin && <div className="hidden md:block"><Footer /></div>}

            {/* Mobile bottom navigation */}
            {!hideBottomNav && <BottomNav />}

            {/* Global Login Modal (rendered once, triggered from anywhere) */}
            <LoginModal />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
     </SettingsProvider>
    </LanguageProvider>
  );
}
