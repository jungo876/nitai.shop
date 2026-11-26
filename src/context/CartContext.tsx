"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { CartItemWithProduct } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api-client";

interface CartSummary {
  items: CartItemWithProduct[];
  count: number;
  subtotal: number;
  has_unavailable: boolean;
}

interface CartContextType extends CartSummary {
  isLoading: boolean;
  refreshCart: () => Promise<void>;
  /** Returns null on success, or an error message to show. */
  addToCart: (params: { product_id: string; variant_id: string; bulk_price_id: string | null; box_count: number }) => Promise<string | null>;
  updateQuantity: (itemId: string, quantity: number) => Promise<string | null>;
  removeItem: (itemId: string) => Promise<string | null>;
}

const EMPTY: CartSummary = { items: [], count: 0, subtotal: 0, has_unavailable: false };
const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [cart, setCart] = useState<CartSummary>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);

  const apply = (data: CartSummary | null) => setCart(data ? { items: data.items ?? [], count: data.count ?? 0, subtotal: data.subtotal ?? 0, has_unavailable: !!data.has_unavailable } : EMPTY);

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCart(EMPTY);
      return;
    }
    setIsLoading(true);
    const r = await api<CartSummary>("/api/cart");
    if (r.ok) apply(r.data);
    setIsLoading(false);
  }, [isLoggedIn]);

  useEffect(() => {
    let active = true;
    if (!isLoggedIn) {
      Promise.resolve().then(() => active && setCart(EMPTY));
      return;
    }
    api<CartSummary>("/api/cart").then((r) => {
      if (active && r.ok) apply(r.data);
    });
    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  const addToCart = useCallback(async (params: { product_id: string; variant_id: string; bulk_price_id: string | null; box_count: number }) => {
    const r = await api<CartSummary>("/api/cart", { body: params });
    if (!r.ok) return r.error;
    apply(r.data);
    return null;
  }, []);

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      // Optimistic update; the server response replaces it with exact prices.
      setCart((c) => ({
        ...c,
        items: c.items.map((i) => (i.id === itemId ? { ...i, quantity, total_units: i.box_count * i.units_per_box * quantity, total_price: i.box_count * i.units_per_box * quantity * i.price_per_unit } : i)),
      }));
      const r = await api<CartSummary>("/api/cart", { method: "PATCH", body: { item_id: itemId, quantity } });
      if (!r.ok) {
        await refreshCart();
        return r.error;
      }
      apply(r.data);
      return null;
    },
    [refreshCart]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      setCart((c) => ({ ...c, items: c.items.filter((i) => i.id !== itemId) }));
      const r = await api<CartSummary>("/api/cart", { method: "DELETE", body: { item_id: itemId } });
      if (!r.ok) {
        await refreshCart();
        return r.error;
      }
      apply(r.data);
      return null;
    },
    [refreshCart]
  );

  return (
    <CartContext.Provider value={{ ...cart, isLoading, refreshCart, addToCart, updateQuantity, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
