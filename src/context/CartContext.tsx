"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { CartItemWithProduct } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

interface CartContextType {
  items: CartItemWithProduct[];
  count: number;
  isLoading: boolean;

  /** Refresh cart from API */
  refreshCart: () => Promise<void>;

  /** Add item to cart */
  addToCart: (params: {
    product_id: string;
    variant_id: string;
    bulk_price_id: string | null;
    box_count: number;
  }) => Promise<boolean>;

  /** Update quantity */
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;

  /** Remove item */
  removeItem: (itemId: string) => Promise<void>;

  /** Subtotal */
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn) {
      setItems([]);
      setCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setCount(data.count || 0);
      }
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  // Load cart on login state change
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(
    async (params: {
      product_id: string;
      variant_id: string;
      bulk_price_id: string | null;
      box_count: number;
    }): Promise<boolean> => {
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        if (!res.ok) return false;
        await refreshCart();
        return true;
      } catch {
        return false;
      }
    },
    [refreshCart]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const unitsPerItem = item.box_count * item.units_per_box;
          const newTotalUnits = unitsPerItem * quantity;
          return {
            ...item,
            quantity,
            total_units: newTotalUnits,
            total_price: newTotalUnits * item.price_per_unit,
          };
        })
      );
      setCount((prev) => {
        const old = items.find((i) => i.id === itemId);
        if (!old) return prev;
        return prev - old.quantity + quantity;
      });

      try {
        await fetch("/api/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_id: itemId, quantity }),
        });
      } catch {
        // Revert on failure
        await refreshCart();
      }
    },
    [items, refreshCart]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      // Optimistic remove
      const removed = items.find((i) => i.id === itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setCount((prev) => prev - (removed?.quantity || 0));

      try {
        await fetch("/api/cart", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_id: itemId }),
        });
      } catch {
        // Revert on failure
        await refreshCart();
      }
    },
    [items, refreshCart]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        isLoading,
        refreshCart,
        addToCart,
        updateQuantity,
        removeItem,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
