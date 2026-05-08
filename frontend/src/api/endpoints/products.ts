import { apiService } from '../../services/api/apiService';
import type { Product } from '../../types';

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductQuery {
  category?: string;
  search?: string;
  badge?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export const productsApi = {
  list: (params?: ProductQuery) =>
    apiService.get<ProductListResponse>('/api/products', params as Record<string, unknown>),
  get: (id: string) => apiService.get<Product>(`/api/products/${id}`),
  create: (data: Omit<Product, 'id'>) => apiService.post<Product>('/api/products', data),
  update: (id: string, data: Partial<Product>) => apiService.put<Product>(`/api/products/${id}`, data),
  remove: (id: string) => apiService.delete<void>(`/api/products/${id}`),
};
