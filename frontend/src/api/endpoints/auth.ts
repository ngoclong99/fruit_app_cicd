import { apiService } from '../../services/api/apiService';
import type { User } from '../../types';

interface AuthResponse { token: string; user: User }

export const authApi = {
  login: (email: string, password: string) =>
    apiService.post<AuthResponse>('/api/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    apiService.post<AuthResponse>('/api/auth/register', data),
  me: () => apiService.get<User>('/api/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiService.patch<{ message: string }>('/api/auth/change-password', { currentPassword, newPassword }),
};
