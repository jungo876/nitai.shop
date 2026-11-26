"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";

interface WishlistContextType {
  /** Set of wishlisted product IDs for O(1) lookup */
  wishlistedIds: Set<string>;
  count: number;
  isLoading: boolean;

  /** Check if a product is wishlisted */
  isWishlisted: (productId: string) => boolean;

  /** Toggle wishlist status */
  toggleWishlist: (productId: string) => Promise<void>;

  /** Refresh from server */
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!isLoggedIn) {
      setWishlistedIds(new Set());
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/wishlist?ids_only=true");
      if (res.ok) {
        const data = await res.json();
        setWishlistedIds(new Set(data.product_ids || []));
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    let active = true;
    if (!isLoggedIn) {
      Promise.resolve().then(() => active && setWishlistedIds(new Set()));
    } else {
      fetch("/api/wishlist?ids_only=true")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => active && d && setWishlistedIds(new Set(d.product_ids || [])))
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  const isWishlisted = useCallback(
    (productId: string) => wishlistedIds.has(productId),
    [wishlistedIds]
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const wasWishlisted = wishlistedIds.has(productId);

      // Optimistic update
      setWishlistedIds((prev) => {
        const next = new Set(prev);
        if (wasWishlisted) {
          next.delete(productId);
        } else {
          next.add(productId);
        }
        return next;
      });

      try {
        if (wasWishlisted) {
          await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
        } else {
          await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: productId }),
          });
        }
      } catch {
        // Revert on failure
        setWishlistedIds((prev) => {
          const next = new Set(prev);
          if (wasWishlisted) {
            next.add(productId);
          } else {
            next.delete(productId);
          }
          return next;
        });
      }
    },
    [wishlistedIds]
  );

  return (
    <WishlistContext.Provider
      value={{
        wishlistedIds,
        count: wishlistedIds.size,
        isLoading,
        isWishlisted,
        toggleWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
