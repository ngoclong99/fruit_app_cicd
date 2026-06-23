import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
}

const loadCart = (): CartItem[] => {
  try {
    const saved = localStorage.getItem('cart');
    return saved ? (JSON.parse(saved) as CartItem[]) : [];
  } catch {
    return [];
  }
};

const saveCart = (items: CartItem[]) => {
  localStorage.setItem('cart', JSON.stringify(items));
};

const initialState: CartState = {
  items: loadCart(),
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (
      state,
      action: PayloadAction<{ product: Product; qty?: number }>
    ) => {
      const { product, qty = 1 } = action.payload;
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        existing.quantity += qty;
      } else {
        state.items.push({ product, quantity: qty });
      }
      saveCart(state.items);
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.product.id !== action.payload);
      saveCart(state.items);
    },
    updateQty: (
      state,
      action: PayloadAction<{ productId: string; qty: number }>
    ) => {
      const { productId, qty } = action.payload;
      if (qty <= 0) {
        state.items = state.items.filter((i) => i.product.id !== productId);
      } else {
        const item = state.items.find((i) => i.product.id === productId);
        if (item) item.quantity = qty;
      }
      saveCart(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      saveCart([]);
    },
  },
});

export const { addToCart, removeFromCart, updateQty, clearCart } =
  cartSlice.actions;
export default cartSlice.reducer;
