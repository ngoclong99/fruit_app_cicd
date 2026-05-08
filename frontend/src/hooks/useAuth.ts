import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { loginAsync, registerAsync, logout as logoutAction } from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const loading = useSelector((state: RootState) => state.auth.loading);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const result = await dispatch(loginAsync({ email, password }));
      return loginAsync.fulfilled.match(result);
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
    dispatch(logoutAction());
  }, [dispatch]);

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin: user?.role === 'admin',
  };
};
