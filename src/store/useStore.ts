import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  name: string;
  username: string;
  role: string;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  note: string;
  is_gift: boolean;
  discount_type: string;
  discount_value: number;
}

export type SaleMode = 'table' | 'self' | 'package';

interface AppState {
  // Auth
  token: string;
  baseUrl: string;
  user: User | null;

  // Navigation
  currentPage: string;

  // POS
  posTab: string;
  saleMode: SaleMode;
  table: { id: number; code: string } | null;
  pkgCust: { id: number; name: string; phone?: string; address?: string } | null;
  cart: Record<string, CartItem>;
  currentOrderId: number | null;
  ovOpen: boolean;

  // Actions
  setToken: (token: string) => void;
  setBaseUrl: (url: string) => void;
  setUser: (user: User | null) => void;
  setPage: (page: string) => void;
  setPosTab: (tab: string) => void;
  logout: () => void;

  // Cart
  addToCart: (item: Omit<CartItem, 'qty' | 'note' | 'is_gift' | 'discount_type' | 'discount_value'>) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  setCart: (cart: Record<string, CartItem>) => void;

  // POS
  openTable: (table: { id: number; code: string }) => void;
  openSelf: () => void;
  openPackage: (cust: { id: number; name: string; phone?: string; address?: string }) => void;
  setOvOpen: (open: boolean) => void;
  setCurrentOrderId: (id: number | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      token: '',
      baseUrl: '',
      user: null,
      currentPage: 'dash',
      posTab: 'active',
      saleMode: 'table',
      table: null,
      pkgCust: null,
      cart: {},
      currentOrderId: null,
      ovOpen: false,

      setToken: (token) => set({ token }),
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setUser: (user) => set({ user }),
      setPage: (page) => set({ currentPage: page }),
      setPosTab: (tab) => set({ posTab: tab }),
      logout: () => set({ token: '', user: null, currentPage: 'dash', cart: {}, ovOpen: false }),

      addToCart: (item) =>
        set((state) => {
          const id = String(item.id);
          const existing = state.cart[id];
          if (existing) {
            return { cart: { ...state.cart, [id]: { ...existing, qty: existing.qty + 1 } } };
          }
          return { cart: { ...state.cart, [id]: { ...item, qty: 1, note: '', is_gift: false, discount_type: '', discount_value: 0 } } };
        }),

      updateCartItem: (id, updates) =>
        set((state) => ({
          cart: { ...state.cart, [id]: { ...state.cart[id], ...updates } },
        })),

      removeFromCart: (id) =>
        set((state) => {
          const newCart = { ...state.cart };
          delete newCart[id];
          return { cart: newCart };
        }),

      clearCart: () => set({ cart: {} }),
      setCart: (cart) => set({ cart }),

      openTable: (table) =>
        set({ saleMode: 'table', table, pkgCust: null, cart: {}, currentOrderId: null, ovOpen: true }),

      openSelf: () =>
        set({ saleMode: 'self', table: null, pkgCust: null, cart: {}, currentOrderId: null, ovOpen: true }),

      openPackage: (cust) =>
        set({ saleMode: 'package', table: null, pkgCust: cust, cart: {}, currentOrderId: null, ovOpen: true }),

      setOvOpen: (open) => set({ ovOpen: open }),
      setCurrentOrderId: (id) => set({ currentOrderId: id }),
    }),
    {
      name: 'anlikpos-store',
      partialize: (state) => ({ token: state.token, baseUrl: state.baseUrl, user: state.user }),
    }
  )
);
