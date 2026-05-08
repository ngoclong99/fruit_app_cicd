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

export const statsApi = {
  get: () => apiService.get<StatsResponse>('/api/stats'),
  getDaily: (from: string, to: string) =>
    apiService.get<DailyStatItem[]>(`/api/stats/daily?from=${from}&to=${to}`),
};
