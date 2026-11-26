"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { AppUser } from "@/lib/types";
import { api } from "@/lib/api-client";

export interface PendingAction {
  type: "buy" | "cart" | "wishlist" | "order" | "account";
  productId?: string;
  returnUrl?: string;
}

export interface Profile extends AppUser {
  business_profile: { shop_name: string | null; gst_number: string | null; pan_number: string | null; business_type: string | null } | null;
  address: { address_line: string | null; landmark: string | null; city: string | null; state: string | null; pincode: string | null; phone_number: string | null } | null;
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; retryAfterSeconds?: number };

interface AuthContextType {
  user: Profile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  showLoginModal: boolean;
  pendingAction: PendingAction | null;
  /** Opens the login sheet (if logged out) and remembers what the user was doing. */
  requireAuth: (action: PendingAction) => void;
  openLogin: () => void;
  closeLoginModal: () => void;
  /** Step 1: send a 6-digit code to the phone. */
  requestOtp: (phone: string) => Promise<Result<{ resendAfterSeconds: number }>>;
  /** Step 2: check the code; on success the session cookie is set. */
  verifyOtp: (phone: string, code: string) => Promise<Result<{ user: Profile; isNew: boolean }>>;
  refreshUser: () => Promise<void>;
  setUser: (user: Profile) => void;
  logout: () => Promise<void>;
  clearPendingAction: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const refreshUser = useCallback(async () => {
    const r = await api<{ user: Profile | null }>("/api/auth/me");
    setUserState(r.ok ? (r.data?.user ?? null) : null);
  }, []);

  useEffect(() => {
    let active = true;
    api<{ user: Profile | null }>("/api/auth/me").then((r) => {
      if (!active) return;
      setUserState(r.ok ? (r.data?.user ?? null) : null);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const requireAuth = useCallback(
    (action: PendingAction) => {
      if (user) return;
      setPendingAction(action);
      setShowLoginModal(true);
    },
    [user]
  );

  const openLogin = useCallback(() => setShowLoginModal(true), []);
  const closeLoginModal = useCallback(() => setShowLoginModal(false), []);

  const requestOtp = useCallback(async (phone: string): Promise<Result<{ resendAfterSeconds: number }>> => {
    const r = await api<{ resendAfterSeconds: number }>("/api/auth/otp/request", { body: { phone_number: phone } });
    if (r.ok) return { ok: true, resendAfterSeconds: r.data?.resendAfterSeconds ?? 30 };
    const retry = r.meta?.retryAfterSeconds as number | undefined;
    return { ok: false, error: r.error ?? "Could not send the code.", retryAfterSeconds: retry ? Math.ceil(retry) : undefined };
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string): Promise<Result<{ user: Profile; isNew: boolean }>> => {
    const r = await api<{ user: Profile; isNew: boolean }>("/api/auth/otp/verify", { body: { phone_number: phone, code } });
    if (!r.ok || !r.data?.user) return { ok: false, error: r.error ?? "Could not verify the code." };
    setUserState(r.data.user);
    setShowLoginModal(false);
    return { ok: true, user: r.data.user, isNew: r.data.isNew };
  }, []);

  const setUser = useCallback((u: Profile) => setUserState(u), []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST", body: {} });
    setUserState(null);
    setPendingAction(null);
  }, []);

  const clearPendingAction = useCallback(() => setPendingAction(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        showLoginModal,
        pendingAction,
        requireAuth,
        openLogin,
        closeLoginModal,
        requestOtp,
        verifyOtp,
        refreshUser,
        setUser,
        logout,
        clearPendingAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
