import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/endpoints/auth';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
        ]);
        if (t) setToken(t);
        if (u) setUser(JSON.parse(u) as User);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (u: User | null, t: string | null) => {
    if (t) await AsyncStorage.setItem('token', t);
    else await AsyncStorage.removeItem('token');
    if (u) await AsyncStorage.setItem('user', JSON.stringify(u));
    else await AsyncStorage.removeItem('user');
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      setUser(res.user);
      setToken(res.token);
      await persist(res.user, res.token);
    },
    [persist],
  );

  const register = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      phone?: string;
    }) => {
      const res = await authApi.register(data);
      setUser(res.user);
      setToken(res.token);
      await persist(res.user, res.token);
    },
    [persist],
  );

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await persist(null, null);
  }, [persist]);

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
      await AsyncStorage.setItem('user', JSON.stringify(me));
    } catch {
      // ignore – likely token expired
    }
  }, []);

  const updateUser = useCallback(async (next: User) => {
    setUser(next);
    await AsyncStorage.setItem('user', JSON.stringify(next));
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await authApi.changePassword(currentPassword, newPassword);
    },
    [],
  );

  const isAdmin = user?.role === 'admin';

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAdmin,
      loading,
      login,
      register,
      logout,
      refresh,
      updateUser,
      changePassword,
    }),
    [
      user,
      token,
      isAdmin,
      loading,
      login,
      register,
      logout,
      refresh,
      updateUser,
      changePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
