import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { loginAsync, registerAsync, logout as logoutAction, setUser } from '../store/slices/authSlice';
import type { User } from '../types';

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
    register,
    logout,
    updateUser,
    isAdmin: user?.role === 'admin',
  };
};
