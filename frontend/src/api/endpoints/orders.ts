import { apiService } from '../../services/api/apiService';
import type { Order, CartItem } from '../../types';

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
  list: (params?: { status?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    apiService.get<OrderListResponse>('/api/orders', params as Record<string, unknown>),
  get: (id: string) => apiService.get<Order>(`/api/orders/${id}`),
  create: (data: CreateOrderData) => apiService.post<Order>('/api/orders', data),
  updateStatus: (id: string, status: Order['status']) =>
    apiService.patch<Order>(`/api/orders/${id}/status`, { status }),
  cancel: (id: string) => apiService.patch<Order>(`/api/orders/${id}/cancel`, {}),
};
