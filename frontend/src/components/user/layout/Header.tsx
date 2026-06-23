import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import AuthModal from "@/components/user/ui/Modal/AuthModal";

export default function Header() {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const handleCartClick = useCallback(() => {
    if (user) navigate("/cart");
    else setShowAuth(true);
  }, [user, navigate]);

  const handleLogout = useCallback(() => {
    logout();
    setUserMenu(false);
    navigate("/");
  }, [logout, navigate]);

  const toggleLang = useCallback(() => {
    i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi");
  }, [i18n]);

  return (
    <>
      <div className="bg-green-800 text-white text-xs text-center py-2 px-4 font-medium">
        {t("nav.topBar")}
      </div>

      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-xl">
                🍃
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-base leading-tight text-green-800">
                  {t("nav.brand")}
                </div>
                <div className="text-gray-400 text-xs leading-tight">
                  {t("nav.brandSlogan")}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-1.5">
              <Link
                to="/search"
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg px-3 py-2 text-sm transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="hidden md:block text-xs">
                  {t("nav.search")}
                </span>
              </Link>

              <button
                type="button"
                onClick={toggleLang}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-green-700 hover:bg-green-50 transition-colors text-xs font-bold"
                title={t("nav.language")}
              >
                {i18n.language === "vi" ? "EN" : "VI"}
              </button>

              <button
                type="button"
                title={t("nav.cart")}
                onClick={handleCartClick}
                className="relative flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-green-700 hover:bg-green-50 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>

              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenu(!userMenu)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-sm font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-700 max-w-22.5 truncate">
                      {user.name}
                    </span>
                    <svg
                      className="w-3 h-3 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {userMenu && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-semibold text-sm text-gray-800 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {user.email}
                        </p>
                        {isAdmin && (
                          <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                          ⚙️ {t("nav.adminPanel")}
                        </Link>
                      )}
                      <Link
                        to="/orders"
                        onClick={() => setUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        📦 {t("nav.myOrders")}
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        👤 {t("nav.myProfile")}
                      </Link>
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          🚪 {t("nav.logout")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  {t("nav.login")}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {userMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setUserMenu(false)}
        />
      )}
    </>
  );
}
