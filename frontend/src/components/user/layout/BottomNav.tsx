import { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { useCart } from '../../../hooks/useCart';

export default function BottomNav() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { count } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = useCallback(
    (path: string, query?: string) => {
      if (location.pathname !== path) return false;
      if (query) return location.search.includes(query);
      return !location.search.includes('cat=');
    },
    [location]
  );

  const handleCart = useCallback(() => {
    if (user) navigate('/cart');
  }, [user, navigate]);

  const tabs = [
    {
      label: t('nav.home'),
      to: '/',
      active: isActive('/'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: t('nav.products'),
      to: '/products',
      active: isActive('/products') && !location.search.includes('cat='),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: t('nav.juice'),
      to: '/drinks',
      active: isActive('/drinks'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3h6l1 7H8L9 3zM8 10c0 4 1 7 4 9m0 0c3-2 4-5 4-9M7 21h10" />
        </svg>
      ),
    },
    {
      label: t('nav.cart'),
      onClick: handleCart,
      active: isActive('/cart'),
      badge: count,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: user ? t('nav.myProfile') : t('nav.login'),
      to: user ? '/profile' : undefined,
      active: isActive('/profile') || isActive('/orders'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] lg:hidden">
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const cls = `flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${
            tab.active ? 'text-green-600' : 'text-gray-500'
          }`;

          const inner = (
            <>
              <span className="relative">
                {tab.icon}
                {tab.badge != null && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold leading-none">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
            </>
          );

          if (tab.onClick) {
            return (
              <button key={tab.label} type="button" onClick={tab.onClick} className={cls}>
                {inner}
              </button>
            );
          }

          return (
            <Link key={tab.label} to={tab.to!} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
