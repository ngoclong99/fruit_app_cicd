import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import {
  loginAsync,
  registerAsync,
  verifyMfaAsync,
  logoutAsync,
  setUser,
} from '@/store/slices/authSlice';
import type { User } from '@/types';

export type LoginOutcome = { mfaRequired: false } | { mfaRequired: true; mfaToken: string };

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const loading = useSelector((state: RootState) => state.auth.loading);

  // Trả về { mfaRequired } để component biết có cần bước nhập mã 6 số hay không.
  const login = useCallback(
    async (email: string, password: string): Promise<LoginOutcome> => {
      const result = await dispatch(loginAsync({ email, password }));
      if (loginAsync.rejected.match(result)) {
        throw new Error((result.payload as string) || 'Login failed');
      }
      const payload = result.payload;
      return payload.mfaRequired
        ? { mfaRequired: true, mfaToken: payload.mfaToken }
        : { mfaRequired: false };
    },
    [dispatch]
  );

  // Bước 2 khi có MFA: gửi mã 6 số.
  const verifyMfa = useCallback(
    async (mfaToken: string, code: string): Promise<boolean> => {
      const result = await dispatch(verifyMfaAsync({ mfaToken, code }));
      if (verifyMfaAsync.rejected.match(result)) {
        throw new Error((result.payload as string) || 'Invalid MFA code');
      }
      return true;
    },
    [dispatch]
  );

  const register = useCallback(
    async (data: { name: string; email: string; password: string; phone?: string }): Promise<boolean> => {
      const result = await dispatch(registerAsync(data));
      if (registerAsync.rejected.match(result)) {
        throw new Error(result.payload as string);
      }
      return true;
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    void dispatch(logoutAsync()); // thu hồi refresh token ở server rồi xoá local
  }, [dispatch]);

  const updateUser = useCallback(
    (next: User) => {
      dispatch(setUser(next));
    },
    [dispatch]
  );

  return {
    user,
    loading,
    login,
    verifyMfa,
    register,
    logout,
    updateUser,
    isAdmin: user?.role === 'admin',
  };
};
