// =============================================================================
// store/CartContext.tsx — Quản lý giỏ hàng + persist vào AsyncStorage
// =============================================================================
// Bản web dùng Redux Toolkit (cartSlice). Bản mobile dùng Context API cho
// nhẹ, vì giỏ hàng đơn giản và không có nhiều slice. Cách dùng giống y:
//
//   const { items, addToCart, ... } = useCart();
//
// Khác biệt KEY:
//   - localStorage (web) -> AsyncStorage (RN). AsyncStorage là async, nên:
//     1) Khi mount, ta phải LOAD trước rồi mới render (dùng cờ hydrated).
//     2) Khi save, dùng useEffect theo dõi items để ghi (debounce nhẹ là OK,
//        ở đây ta ghi mỗi lần items đổi — đủ nhanh cho demo).
//   - Không có "hydrated" thì khi cartItems khởi tạo = [] sẽ ghi đè dữ liệu
//     cũ trong storage trước khi đọc lên xong.
// =============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem, Product } from '@/types';

interface CartContextValue {
  items: CartItem[];
  count: number; // tổng số lượng (dùng cho badge tab)
  total: number; // tổng tiền chưa cộng phí ship
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = 'cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  // Cờ này quan trọng: chặn việc ghi [] vào storage trước khi đọc xong dữ liệu cũ
  const [hydrated, setHydrated] = useState(false);

  // LOAD lần đầu khi mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setItems(JSON.parse(saved) as CartItem[]);
      } catch {
        // storage hỏng — bỏ qua, giỏ trống
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // SAVE mỗi khi items đổi (sau khi đã hydrate)
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, [items, hydrated]);

  // Các reducer kiểu functional updater — y như React web
  const addToCart = useCallback((product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + qty }
            : i,
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((i) => i.product.id !== productId);
      return prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: qty } : i,
      );
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  // useMemo tránh re-render con cháu mỗi lần Provider render
  const count = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items],
  );
  const total = useMemo(
    () => items.reduce((s, i) => s + i.product.price * i.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      total,
      addToCart,
      removeFromCart,
      updateQty,
      clearCart,
    }),
    [items, count, total, addToCart, removeFromCart, updateQty, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
