import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from './AuthContext.tsx';
import type { Product } from '../types/ecommerce.ts';

const GUEST_WISHLIST_KEY = 'atelier_guest_wishlist_v1';

interface WishlistContextValue {
  productIds: string[];
  products: Product[];
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<boolean>;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

function readGuestIds(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [productIds, setProductIds] = useState<string[]>(() => readGuestIds());
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync guest wishlist upon login
  useEffect(() => {
    if (!user) {
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(productIds));
      return;
    }
    const guestIds = readGuestIds();
    const sync = async () => {
      if (guestIds.length > 0) {
        const res = await apiFetch<{ productIds: string[] }>('/api/wishlist/sync', {
          method: 'POST',
          body: JSON.stringify({ product_ids: guestIds }),
        });
        localStorage.removeItem(GUEST_WISHLIST_KEY);
        setProductIds(res.productIds);
      }
      const full = await apiFetch<{ productIds: string[]; products: Product[] }>('/api/wishlist');
      setProductIds(full.productIds);
      setProducts(full.products);
    };
    sync().catch(() => {});
  }, [user]);

  // Fetch product details for guest wishlist
  useEffect(() => {
    if (user) return;
    if (productIds.length === 0) {
      setProducts([]);
      return;
    }
    setLoading(true);
    apiFetch<{ products: Product[] }>('/api/products?limit=100')
      .then((res) => {
        setProducts(res.products.filter((p) => productIds.includes(p.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productIds, user]);

  const isWishlisted = useCallback(
    (productId: string) => productIds.includes(productId),
    [productIds]
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (user) {
        const res = await apiFetch<{ added: boolean; productIds: string[] }>('/api/wishlist/toggle', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId }),
        });
        setProductIds(res.productIds);
        const full = await apiFetch<{ productIds: string[]; products: Product[] }>('/api/wishlist');
        setProducts(full.products);
        return res.added;
      } else {
        let added = false;
        setProductIds((prev) => {
          const exists = prev.includes(productId);
          added = !exists;
          const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
          localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(next));
          return next;
        });
        return added;
      }
    },
    [user]
  );

  return (
    <WishlistContext.Provider value={{ productIds, products, isWishlisted, toggleWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
