import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CONFIG, type WatchConfig } from './three/watch';

export interface CartItem {
  id: string;
  name: string;
  detail: string;
  price: number;
  qty: number;
  thumb?: string;
}

export interface Appointment {
  id: string;
  city: string;
  date: string; // ISO yyyy-mm-dd
  time: string;
  name: string;
  note: string;
  createdAt: number;
}

export interface Toast {
  id: number;
  text: string;
  leaving?: boolean;
}

interface State {
  ready: boolean;
  setReady(): void;
  /** the hero 3D scene has compiled and can be shown */
  stageReady: boolean;
  setStageReady(): void;

  config: WatchConfig;
  setConfig(patch: Partial<WatchConfig>): void;

  cart: CartItem[];
  cartOpen: boolean;
  checkoutOpen: boolean;
  addToCart(item: Omit<CartItem, 'qty'>): void;
  setQty(id: string, qty: number): void;
  removeItem(id: string): void;
  clearCart(): void;
  openCart(open: boolean): void;
  openCheckout(open: boolean): void;

  quickView: string | null;
  openQuickView(id: string | null): void;

  menuOpen: boolean;
  openMenu(open: boolean): void;

  appointments: Appointment[];
  addAppointment(a: Omit<Appointment, 'id' | 'createdAt'>): void;

  newsletter: string | null;
  subscribe(email: string): void;

  toasts: Toast[];
  toast(text: string): void;
  dismissToast(id: number): void;
}

let toastId = 0;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ready: false,
      setReady: () => set({ ready: true }),
      stageReady: false,
      setStageReady: () => set({ stageReady: true }),

      config: DEFAULT_CONFIG,
      setConfig: (patch) => set({ config: { ...get().config, ...patch } }),

      cart: [],
      cartOpen: false,
      checkoutOpen: false,
      addToCart: (item) => {
        const cart = get().cart;
        const found = cart.find((c) => c.id === item.id);
        set({
          cart: found
            ? cart.map((c) => (c.id === item.id ? { ...c, qty: Math.min(9, c.qty + 1) } : c))
            : [...cart, { ...item, qty: 1 }],
        });
        get().toast(`أُضيفت ${item.name} إلى السلة`);
      },
      setQty: (id, qty) =>
        set({
          cart:
            qty <= 0
              ? get().cart.filter((c) => c.id !== id)
              : get().cart.map((c) => (c.id === id ? { ...c, qty: Math.min(9, qty) } : c)),
        }),
      removeItem: (id) => set({ cart: get().cart.filter((c) => c.id !== id) }),
      clearCart: () => set({ cart: [] }),
      openCart: (open) => set({ cartOpen: open, menuOpen: false }),
      openCheckout: (open) => set({ checkoutOpen: open, cartOpen: false }),

      quickView: null,
      openQuickView: (id) => set({ quickView: id }),

      menuOpen: false,
      openMenu: (open) => set({ menuOpen: open }),

      appointments: [],
      addAppointment: (a) =>
        set({
          appointments: [
            ...get().appointments,
            { ...a, id: Math.random().toString(36).slice(2, 10), createdAt: Date.now() },
          ],
        }),

      newsletter: null,
      subscribe: (email) => set({ newsletter: email }),

      toasts: [],
      toast: (text) => {
        const id = ++toastId;
        set({ toasts: [...get().toasts.slice(-2), { id, text }] });
        // play the leaving animation, then remove
        setTimeout(() => set({ toasts: get().toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)) }), 3600);
        setTimeout(() => get().dismissToast(id), 4200);
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
    }),
    {
      name: 'alajaj-store-v1',
      partialize: (s) => ({
        cart: s.cart,
        appointments: s.appointments,
        newsletter: s.newsletter,
        config: s.config,
      }),
    },
  ),
);

export const cartCount = (s: State) => s.cart.reduce((n, c) => n + c.qty, 0);
export const cartSubtotal = (s: State) => s.cart.reduce((n, c) => n + c.qty * c.price, 0);
