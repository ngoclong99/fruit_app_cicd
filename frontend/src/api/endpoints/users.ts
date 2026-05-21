import { apiService } from '../../services/api/apiService';
import type { User } from '../../types';

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'blocked';
}

export const usersApi = {
  list: () => apiService.get<User[]>('/api/users'),
  get: (id: string) => apiService.get<User>(`/api/users/${id}`),
  create: (data: CreateUserData) => apiService.post<User>('/api/users', data),
  update: (id: string, data: Partial<User>) => apiService.put<User>(`/api/users/${id}`, data),
  updateStatus: (id: string, status: 'active' | 'blocked') =>
    apiService.patch<User>(`/api/users/${id}/status`, { status }),
  delete: (id: string) => apiService.delete<void>(`/api/users/${id}`),
};
