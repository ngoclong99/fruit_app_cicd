import { useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import type { Product } from '../types';
import {
  addToCart as addAction,
  removeFromCart as removeAction,
  updateQty as updateAction,
  clearCart as clearAction,
} from '../store/slices/cartSlice';

export const useCart = () => {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((state: RootState) => state.cart.items);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [items]
  );
  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const addToCart = useCallback(
    (product: Product, qty?: number) => dispatch(addAction({ product, qty })),
    [dispatch]
  );
  const removeFromCart = useCallback(
    (productId: string) => dispatch(removeAction(productId)),
    [dispatch]
  );
  const updateQty = useCallback(
    (productId: string, qty: number) => dispatch(updateAction({ productId, qty })),
    [dispatch]
  );
  const clearCart = useCallback(() => dispatch(clearAction()), [dispatch]);

  return { items, total, count, addToCart, removeFromCart, updateQty, clearCart };
};
