import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from './AuthContext.tsx';
import type { CartItem, Product, ProductVariant, StoreSettings } from '../types/ecommerce.ts';

const GUEST_CART_KEY = 'atelier_guest_cart_v1';
const SAVED_FOR_LATER_KEY = 'atelier_saved_later_v1';

interface CartContextValue {
  items: CartItem[];
  savedForLater: CartItem[];
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  itemCount: number;
  subtotal: number;
  originalSubtotal: number;
  appliedCoupon: { code: string; discount: number } | null;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => void;
  addToCart: (product: Product, variant: ProductVariant, quantity?: number, openDrawerOnAdd?: boolean) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  saveForLater: (item: CartItem) => Promise<void>;
  moveToCartFromSaved: (item: CartItem) => Promise<void>;
  removeSavedItem: (variantId: string) => void;
  clearCart: () => void;
  settings: StoreSettings;
}

const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'ATELIER',
  free_shipping_threshold: 1999,
  standard_shipping_fee: 149,
  express_shipping_fee: 299,
  tax_rate_percent: 12,
  support_email: 'concierge@atelier-store.com',
  announcement_text: 'NEW SEASON COLLECTION IS HERE · FREE SHIPPING ON ORDERS ABOVE ₹1,999',
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => readLocalJson<CartItem[]>(GUEST_CART_KEY, []));
  const [savedForLater, setSavedForLater] = useState<CartItem[]>(() =>
    readLocalJson<CartItem[]>(SAVED_FOR_LATER_KEY, [])
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    apiFetch<{ settings: StoreSettings }>('/api/settings/public')
      .then((res) => setSettings(res.settings))
      .catch(() => {});
  }, []);

  // Persist guest cart to localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    }
  }, [items, user]);

  useEffect(() => {
    localStorage.setItem(SAVED_FOR_LATER_KEY, JSON.stringify(savedForLater));
  }, [savedForLater]);

  // Sync guest cart to server when user logs in
  useEffect(() => {
    if (!user) return;
    const guestItems = readLocalJson<CartItem[]>(GUEST_CART_KEY, []);
    const sync = async () => {
      if (guestItems.length > 0) {
        const res = await apiFetch<{ items: CartItem[] }>('/api/cart/sync', {
          method: 'POST',
          body: JSON.stringify({
            items: guestItems.map((g) => ({
              product_variant_id: g.product_variant_id,
              quantity: g.quantity,
            })),
          }),
        });
        localStorage.removeItem(GUEST_CART_KEY);
        setItems(res.items);
      } else {
        const res = await apiFetch<{ items: CartItem[] }>('/api/cart');
        setItems(res.items);
      }
    };
    sync().catch(() => {});
  }, [user]);

  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const originalSubtotal = items.reduce((sum, i) => sum + i.original_price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  // Re-validate coupon if subtotal changes
  useEffect(() => {
    if (!appliedCoupon || subtotal <= 0) {
      if (subtotal <= 0 && appliedCoupon) setAppliedCoupon(null);
      return;
    }
    apiFetch<{ valid: boolean; code: string; discount: number }>('/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code: appliedCoupon.code, subtotal }),
    })
      .then((res) => setAppliedCoupon({ code: res.code, discount: res.discount }))
      .catch(() => setAppliedCoupon(null));
  }, [subtotal]);

  const applyCoupon = useCallback(
    async (code: string) => {
      const res = await apiFetch<{ valid: boolean; code: string; discount: number }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal }),
      });
      setAppliedCoupon({ code: res.code, discount: res.discount });
    },
    [subtotal]
  );

  const removeCoupon = useCallback(() => setAppliedCoupon(null), []);

  const addToCart = useCallback(
    async (product: Product, variant: ProductVariant, quantity = 1, openDrawerOnAdd = true) => {
      if (variant.stock_quantity < 1) {
        throw new Error('This variant is currently out of stock.');
      }
      if (user) {
        const res = await apiFetch<{ items: CartItem[] }>('/api/cart', {
          method: 'POST',
          body: JSON.stringify({ product_variant_id: variant.id, quantity }),
        });
        setItems(res.items);
      } else {
        const unitPrice = (product.sale_price ?? product.base_price) + (variant.price_adjustment || 0);
        const originalPrice = Math.max(unitPrice, product.base_price + (variant.price_adjustment || 0));
        setItems((prev) => {
          const existing = prev.find((i) => i.product_variant_id === variant.id);
          if (existing) {
            return prev.map((i) =>
              i.product_variant_id === variant.id
                ? { ...i, quantity: Math.min(variant.stock_quantity, i.quantity + quantity) }
                : i
            );
          }
          const newItem: CartItem = {
            id: `local-${variant.id}`,
            product_id: product.id,
            product_variant_id: variant.id,
            product_name: product.name,
            product_slug: product.slug,
            brand: product.brand,
            image_url: product.images[0]?.image_url || '',
            selected_size: variant.size,
            selected_color: variant.color,
            color_hex: variant.color_hex,
            unit_price: unitPrice,
            original_price: originalPrice,
            quantity: Math.min(variant.stock_quantity, quantity),
            stock_quantity: variant.stock_quantity,
          };
          return [...prev, newItem];
        });
      }
      if (openDrawerOnAdd) setIsDrawerOpen(true);
    },
    [user]
  );

  const updateQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      const clamped = Math.max(0, quantity);
      if (user) {
        const res = await apiFetch<{ items: CartItem[] }>(`/api/cart/${encodeURIComponent(variantId)}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity: clamped }),
        });
        setItems(res.items);
      } else {
        setItems((prev) =>
          clamped === 0
            ? prev.filter((i) => i.product_variant_id !== variantId)
            : prev.map((i) =>
                i.product_variant_id === variantId
                  ? { ...i, quantity: Math.min(i.stock_quantity, clamped) }
                  : i
              )
        );
      }
    },
    [user]
  );

  const removeItem = useCallback(
    async (variantId: string) => {
      await updateQuantity(variantId, 0);
    },
    [updateQuantity]
  );

  const saveForLater = useCallback(
    async (item: CartItem) => {
      setSavedForLater((prev) =>
        prev.some((s) => s.product_variant_id === item.product_variant_id) ? prev : [...prev, item]
      );
      await removeItem(item.product_variant_id);
    },
    [removeItem]
  );

  const moveToCartFromSaved = useCallback(
    async (item: CartItem) => {
      setSavedForLater((prev) => prev.filter((s) => s.product_variant_id !== item.product_variant_id));
      if (user) {
        const res = await apiFetch<{ items: CartItem[] }>('/api/cart', {
          method: 'POST',
          body: JSON.stringify({ product_variant_id: item.product_variant_id, quantity: item.quantity }),
        });
        setItems(res.items);
      } else {
        setItems((prev) =>
          prev.some((i) => i.product_variant_id === item.product_variant_id)
            ? prev
            : [...prev, item]
        );
      }
    },
    [user]
  );

  const removeSavedItem = useCallback((variantId: string) => {
    setSavedForLater((prev) => prev.filter((s) => s.product_variant_id !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedCoupon(null);
    localStorage.removeItem(GUEST_CART_KEY);
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        savedForLater,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        itemCount,
        subtotal,
        originalSubtotal,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        addToCart,
        updateQuantity,
        removeItem,
        saveForLater,
        moveToCartFromSaved,
        removeSavedItem,
        clearCart,
        settings,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
