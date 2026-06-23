import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, isMfaChallenge } from '@/api/endpoints/auth';
import { tokenStorage } from '@/shared/storage/tokenStorage';
import type { User } from '@/types';

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

  // Hydrate từ AsyncStorage khi app khởi động.
  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          tokenStorage.getToken(),
          tokenStorage.getUser<User>(),
        ]);
        if (t) setToken(t);
        if (u) setUser(u);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (u: User, t: string, rt: string) => {
    await tokenStorage.setToken(t);
    await tokenStorage.setRefreshToken(rt);
    await tokenStorage.setUser(u);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      // App mobile chưa có UI nhập mã MFA → báo dùng web nếu tài khoản bật MFA.
      if (isMfaChallenge(res)) {
        throw new Error('Tài khoản bật xác thực 2 lớp (MFA) — vui lòng đăng nhập trên web.');
      }
      setUser(res.user);
      setToken(res.token);
      await persist(res.user, res.token, res.refreshToken);
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
      await persist(res.user, res.token, res.refreshToken);
    },
    [persist],
  );

  const logout = useCallback(async () => {
    // Thu hồi refresh token ở server (best-effort) rồi xoá local.
    const rt = await tokenStorage.getRefreshToken();
    if (rt) {
      try { await authApi.logout(rt); } catch { /* best-effort */ }
    }
    setUser(null);
    setToken(null);
    await tokenStorage.clear();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
      await tokenStorage.setUser(me);
    } catch {
      // ignore – likely token expired
    }
  }, []);

  const updateUser = useCallback(async (next: User) => {
    setUser(next);
    await tokenStorage.setUser(next);
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
