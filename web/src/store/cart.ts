import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../api/client';

export interface CartItem {
  product: Product;
  qty: number;
}

interface CartState {
  items: Record<string, CartItem>; // keyed by productId
  add: (product: Product) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  totalUnits: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: {},
      add: (product) => {
        const items = get().items;
        const cur = items[product.id]?.qty ?? 0;
        const next = Math.min(cur + product.packSize, product.stock);
        set({ items: { ...items, [product.id]: { product, qty: next } } });
      },
      setQty: (productId, qty) => {
        const items = { ...get().items };
        if (qty <= 0) delete items[productId];
        else items[productId] = { ...items[productId], qty };
        set({ items });
      },
      remove: (productId) => {
        const items = { ...get().items };
        delete items[productId];
        set({ items });
      },
      clear: () => set({ items: {} }),
      totalUnits: () => Object.values(get().items).reduce((s, i) => s + i.qty, 0),
    }),
    { name: 'dmario-cart' },
  ),
);
