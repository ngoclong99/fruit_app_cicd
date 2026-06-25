import { apiService } from '@/services/api/apiService';
import type { User } from '@/types';

export interface AuthResponse { token: string; refreshToken: string; user: User }
export interface MfaChallenge { mfaRequired: true; mfaToken: string }
export type LoginResult = AuthResponse | MfaChallenge;

export const isMfaChallenge = (r: LoginResult): r is MfaChallenge =>
  (r as MfaChallenge).mfaRequired === true;

export const authApi = {
  login: (email: string, password: string) =>
    apiService.post<LoginResult>('/api/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    apiService.post<AuthResponse>('/api/auth/register', data),

  // Bước 2 của login khi bật MFA
  verifyMfaLogin: (mfaToken: string, code: string) =>
    apiService.post<AuthResponse>('/api/auth/mfa/verify', { mfaToken, code }),

  // Token revocation
  refresh: (refreshToken: string) =>
    apiService.post<{ token: string; refreshToken: string }>('/api/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) =>
    apiService.post<{ message: string }>('/api/auth/logout', { refreshToken }),

  me: () => apiService.get<User>('/api/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiService.patch<{ message: string }>('/api/auth/change-password', { currentPassword, newPassword }),

  // Email verification
  verifyEmail: (token: string) =>
    apiService.get<{ message: string }>('/api/auth/verify-email', { token }),
  resendVerification: () =>
    apiService.post<{ message: string }>('/api/auth/resend-verification'),

  // MFA (TOTP)
  mfaSetup: () => apiService.post<{ secret: string; otpauthUrl: string }>('/api/auth/mfa/setup'),
  mfaEnable: (code: string) => apiService.post<{ message: string }>('/api/auth/mfa/enable', { code }),
  mfaDisable: (code: string) => apiService.post<{ message: string }>('/api/auth/mfa/disable', { code }),
};
