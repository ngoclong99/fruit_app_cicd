import api from '@/api/client';
import type { User } from '@/types';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}
export interface MfaChallenge {
  mfaRequired: true;
  mfaToken: string;
}
export type LoginResult = AuthResponse | MfaChallenge;

export const isMfaChallenge = (r: LoginResult): r is MfaChallenge =>
  (r as MfaChallenge).mfaRequired === true;

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResult>('/api/auth/login', { email, password }).then((r) => r.data),
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post<AuthResponse>('/api/auth/register', data).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<{ token: string; refreshToken: string }>('/api/auth/refresh', { refreshToken }).then((r) => r.data),
  logout: (refreshToken: string) =>
    api.post<{ message: string }>('/api/auth/logout', { refreshToken }).then((r) => r.data),

  me: () => api.get<User>('/api/auth/me').then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api
      .patch<{ message: string }>('/api/auth/change-password', { currentPassword, newPassword })
      .then((r) => r.data),
};
