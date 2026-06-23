import api from '@/api/client';
import type { Product } from '@/types';

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
    api
      .get<ProductListResponse>('/api/products', { params })
      .then((r) => r.data),
  get: (id: string) =>
    api.get<Product>(`/api/products/${id}`).then((r) => r.data),
};
