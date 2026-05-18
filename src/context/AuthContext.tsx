"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { AppUser } from "@/lib/types";

interface PendingAction {
  type: "buy" | "cart" | "wishlist" | "order";
  productId?: string;
  returnUrl?: string;
}

interface AuthContextType {
  user: AppUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  showLoginModal: boolean;
  pendingAction: PendingAction | null;

  /** Call this to require login before an action */
  requireAuth: (action: PendingAction) => void;
  /** Close the login modal */
  closeLoginModal: () => void;
  /** Login with phone number */
  loginWithPhone: (phone: string) => Promise<AppUser | null>;
  /** Update user after profile setup */
  setUser: (user: AppUser) => void;
  /** Logout */
  logout: () => void;
  /** Clear pending action */
  clearPendingAction: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "nck_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Hydrate from API on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUserState(data.user);
          }
        }
      } catch (err) {
        // ignore errors
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const requireAuth = useCallback((action: PendingAction) => {
    if (user) {
      // Already logged in - no modal needed
      return;
    }
    setPendingAction(action);
    setShowLoginModal(true);
  }, [user]);

  const closeLoginModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  const loginWithPhone = useCallback(async (phone: string): Promise<AppUser | null> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.user) {
        setUserState(data.user);
        setShowLoginModal(false);
        return data.user;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const setUser = useCallback((u: AppUser) => {
    setUserState(u);
  }, []);

  const logout = useCallback(async () => {
    setUserState(null);
    setPendingAction(null);
    await fetch("/api/auth/logout", { method: "POST" });
  }, []);

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        showLoginModal,
        pendingAction,
        requireAuth,
        closeLoginModal,
        loginWithPhone,
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
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
