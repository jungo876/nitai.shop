"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading, requireAuth, logout } = useAuth();
  const { count: wishlistCount } = useWishlist();
  
  // The logged-in user's full profile (business + address) comes from the auth context.
  const profile = user;
  const profileLoading = false;

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      requireAuth({ type: "account", returnUrl: "/account" });
      router.replace("/");
    }
  }, [authLoading, isLoggedIn, router, requireAuth]);

  if (authLoading || (isLoggedIn && profileLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
          <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
            <div className="h-6 w-24 bg-surface animate-pulse rounded"></div>
          </div>
        </div>
        <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
          {/* Skeleton Profile */}
          <div className="animate-pulse flex gap-4 items-center">
            <div className="h-16 w-16 bg-surface rounded-full"></div>
            <div className="space-y-2">
              <div className="h-5 w-32 bg-surface rounded"></div>
              <div className="h-4 w-24 bg-surface rounded"></div>
            </div>
          </div>
          <div className="rounded-2xl border border-card-border bg-card-bg p-5 sm:p-6 space-y-5">
             <div className="h-10 bg-surface rounded w-full"></div>
             <div className="h-10 bg-surface rounded w-full"></div>
             <div className="h-10 bg-surface rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  if (!profile.is_profile_complete) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
          <div className="mx-auto max-w-lg px-4 py-3 flex items-center">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Home
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-lg px-4 py-16 flex-1 flex flex-col items-center justify-center text-center">
          <div className="h-20 w-20 bg-primary rounded-full flex items-center justify-center mb-6 shadow-lg">
             <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
             </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Profile Incomplete</h2>
          <p className="text-muted mb-8 text-sm max-w-xs">
            Complete your profile to manage orders and checkout securely.
          </p>
          <Link
            href="/account/setup"
            className="w-full rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200"
          >
            Complete Your Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Home
          </button>
          <span className="text-xs font-medium text-foreground tracking-wider uppercase">My Account</span>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{profile.name}</h1>
            <p className="text-sm text-muted mt-1">{profile.phone_number}</p>
          </div>
          <Link
            href="/account/setup"
            className="text-primary text-sm font-semibold hover:underline"
          >
            Edit Profile
          </Link>
        </div>

        <div className="space-y-6">
          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/wishlist"
              className="rounded-2xl border border-card-border bg-card-bg p-4 flex items-center gap-3 hover:shadow-md transition-all duration-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Wishlist</p>
                <p className="text-xs text-muted">{wishlistCount} {wishlistCount === 1 ? "item" : "items"}</p>
              </div>
            </Link>
            <Link
              href="/cart"
              className="rounded-2xl border border-card-border bg-card-bg p-4 flex items-center gap-3 hover:shadow-md transition-all duration-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">My Cart</p>
                <p className="text-xs text-muted">View cart</p>
              </div>
            </Link>
            <Link
              href="/orders"
              className="rounded-2xl border border-card-border bg-card-bg p-4 flex items-center gap-3 hover:shadow-md transition-all duration-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">My Orders</p>
                <p className="text-xs text-muted">View history</p>
              </div>
            </Link>
          </div>

          {/* Admin Panel (Mobile Friendly) */}
          {profile.is_admin && (
            <section className="rounded-2xl border border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 p-5 sm:p-6">
              <h3 className="text-sm font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-4">Admin Panel</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Link
                  href="/admin"
                  className="rounded-xl border border-amber-200 dark:border-amber-800 bg-card-bg p-3 flex flex-col items-center justify-center text-center gap-2 hover:shadow-md hover:border-amber-300 transition-all duration-200"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                    <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-foreground">Dashboard</span>
                </Link>
                <Link
                  href="/admin/orders"
                  className="rounded-xl border border-amber-200 dark:border-amber-800 bg-card-bg p-3 flex flex-col items-center justify-center text-center gap-2 hover:shadow-md hover:border-amber-300 transition-all duration-200"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                    <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-foreground">Orders</span>
                </Link>
                <Link
                  href="/admin/banners"
                  className="rounded-xl border border-amber-200 dark:border-amber-800 bg-card-bg p-3 flex flex-col items-center justify-center text-center gap-2 hover:shadow-md hover:border-amber-300 transition-all duration-200"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                    <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-foreground">Banners</span>
                </Link>
              </div>
            </section>
          )}

          {/* Business Details */}
          <section className="rounded-2xl border border-card-border bg-card-bg p-5 sm:p-6">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Business Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted mb-1">Shop Name</p>
                <p className="text-sm font-medium text-foreground">{profile.business_profile?.shop_name || "N/A"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted mb-1">GST Number</p>
                  <p className="text-sm font-medium text-foreground">{profile.business_profile?.gst_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">PAN Number</p>
                  <p className="text-sm font-medium text-foreground">{profile.business_profile?.pan_number || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">WhatsApp Number</p>
                <p className="text-sm font-medium text-foreground">{profile.whatsapp_number || profile.phone_number}</p>
              </div>
            </div>
          </section>

          {/* Address Details */}
          <section className="rounded-2xl border border-card-border bg-card-bg p-5 sm:p-6">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Shipping Address</h3>
            {profile.address ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{profile.address.address_line}</p>
                {profile.address.landmark && (
                  <p className="text-sm text-muted">Landmark: {profile.address.landmark}</p>
                )}
                <p className="text-sm text-muted">
                  {profile.address.city}, {profile.address.state} - {profile.address.pincode}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">No address provided.</p>
            )}
          </section>

          <button
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
