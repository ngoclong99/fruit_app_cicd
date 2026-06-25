import { apiService } from '@/services/api/apiService';
import type { Category } from '@/types';

export const categoriesApi = {
  list: () => apiService.get<Category[]>('/api/categories'),
  tree: () => apiService.get<Category[]>('/api/categories/tree'),
};
