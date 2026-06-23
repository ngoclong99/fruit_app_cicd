import type { User } from '@/types';

export type AuthStatus = 'ok' | 'unauthenticated' | 'forbidden';

export const checkAuth = (user: User | null): AuthStatus => {
  if (!user) return 'unauthenticated';
  return 'ok';
};

export const checkAdmin = (user: User | null): AuthStatus => {
  if (!user) return 'unauthenticated';
  if (user.role !== 'admin') return 'forbidden';
  return 'ok';
};

export const PROTECTED_ROUTES = ['/checkout', '/orders', '/profile'] as const;
export const ADMIN_ROUTES = ['/admin', '/admin/products', '/admin/orders', '/admin/users'] as const;

export const getRouteAccess = (
  pathname: string,
  user: User | null
): AuthStatus => {
  const isAdmin = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  if (isAdmin) return checkAdmin(user);
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected) return checkAuth(user);
  return 'ok';
};
