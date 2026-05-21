import api from '../client';
import type { User } from '../../types';

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    api
      .post<AuthResponse>('/api/auth/login', { email, password })
      .then((r) => r.data),
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => api.post<AuthResponse>('/api/auth/register', data).then((r) => r.data),
  me: () => api.get<User>('/api/auth/me').then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api
      .patch<{ message: string }>('/api/auth/change-password', {
        currentPassword,
        newPassword,
      })
      .then((r) => r.data),
};
