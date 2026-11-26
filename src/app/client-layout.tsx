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

  // Pages with their own fixed bottom action bar hide the tab bar so it cannot cover the button.
  const hideBottomNav = isAdmin || pathname === "/cart" || pathname === "/checkout" || pathname.startsWith("/orders/");
  // The same pages would hide the footer behind their action bar, so skip it there.
  const showFooter = !hideBottomNav;
  const bottomNavSpace = "pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0";

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

            <main className="flex-1">{children}</main>

            {showFooter && <Footer />}
            {/* Room for the fixed mobile tab bar so it never covers content */}
            {!hideBottomNav && <div aria-hidden="true" className={`md:hidden ${bottomNavSpace}`} />}

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
