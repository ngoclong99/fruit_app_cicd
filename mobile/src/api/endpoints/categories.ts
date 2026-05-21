import api from '../client';
import type { Category } from '../../types';

export const categoriesApi = {
  list: () => api.get<Category[]>('/api/categories').then((r) => r.data),
  tree: () => api.get<Category[]>('/api/categories/tree').then((r) => r.data),
};
