import api from '../client';
import type { Order, CartItem, OrderStatus } from '../../types';

export interface OrderListResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateOrderData {
  items: CartItem[];
  total: number;
  address: string;
  phone: string;
  note?: string;
}

export const ordersApi = {
  list: (params?: {
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) =>
    api
      .get<OrderListResponse>('/api/orders', { params })
      .then((r) => r.data),
  get: (id: string) => api.get<Order>(`/api/orders/${id}`).then((r) => r.data),
  create: (data: CreateOrderData) =>
    api.post<Order>('/api/orders', data).then((r) => r.data),
  cancel: (id: string) =>
    api.patch<Order>(`/api/orders/${id}/cancel`, {}).then((r) => r.data),
  updateStatus: (id: string, status: OrderStatus) =>
    api
      .patch<Order>(`/api/orders/${id}/status`, { status })
      .then((r) => r.data),
};
