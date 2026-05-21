import { apiService } from '../../services/api/apiService';
import type { Order } from '../../types';

export interface StatsResponse {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  statusCounts: Record<string, number>;
  monthlyRevenue: { month: string; revenue: number }[];
  recentOrders: Order[];
}

export interface DailyStatItem {
  date: string;
  orders: number;
  revenue: number;
}

export interface TopProductItem {
  productId: string;
  name: string;
  image?: string;
  quantity: number;
  revenue: number;
}

export interface TopCustomerItem {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  totalSpent: number;
}

export interface CategoryStatItem {
  category: string;
  quantity: number;
  revenue: number;
}

export const statsApi = {
  get: () => apiService.get<StatsResponse>('/api/stats'),
  getDaily: (from: string, to: string) =>
    apiService.get<DailyStatItem[]>(`/api/stats/daily?from=${from}&to=${to}`),
  getTopProducts: (limit = 10) =>
    apiService.get<TopProductItem[]>('/api/stats/top-products', { limit }),
  getTopCustomers: (limit = 10) =>
    apiService.get<TopCustomerItem[]>('/api/stats/top-customers', { limit }),
  getByCategory: () => apiService.get<CategoryStatItem[]>('/api/stats/by-category'),
};
