import { useState, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Product } from "@/types";
import { getProductName } from "@/utils/product";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/user/ui/Modal/AuthModal";

interface Props {
  product: Product;
}

const BADGE_CLS: Record<string, string> = {
  hot: "bg-orange-500 text-white",
  new: "bg-blue-500 text-white",
  sale: "bg-red-500 text-white",
};

const ProductCard = memo(function ProductCard({ product }: Props) {
  const { t, i18n } = useTranslation();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [added, setAdded] = useState(false);
  const displayName = getProductName(product, i18n.language);

  const discount = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      )
    : 0;

  const badgeLabel =
    product.badge === "sale"
      ? `-${discount}%`
      : product.badge === "hot"
        ? t("badge.hot")
        : product.badge === "new"
          ? t("badge.new")
          : "";

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) {
        setShowAuth(true);
        return;
      }
      addToCart(product);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    },
    [user, addToCart, product],
  );

  return (
    <>
      <Link
        to={`/products/${product.id}`}
        className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
      >
        <div className="relative overflow-hidden bg-gray-50">
          <img
            src={product.image}
            alt={displayName}
            loading="lazy"
            decoding="async"
            className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.badge && (
            <span
              className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-md ${BADGE_CLS[product.badge]}`}
            >
              {badgeLabel}
            </span>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg">
                {t("product.outOfStock")}
              </span>
            </div>
          )}
        </div>

        <div className="p-3 flex flex-col flex-1">
          <p className="text-xs text-gray-400 mb-1 truncate">
            📍 {product.origin}
          </p>
          <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 mb-2 group-hover:text-green-700 transition-colors">
            {displayName}
          </h3>
          <div className="flex items-center gap-1 mb-3">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className={`w-3 h-3 ${i < Math.round(product.rating) ? "text-yellow-400" : "text-gray-200"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-gray-400">
              ({product.reviewCount})
            </span>
          </div>

          <div className="mt-auto">
            <div className="flex items-baseline gap-1.5 mb-2.5">
              <span className="text-base font-bold text-green-700">
                {product.price.toLocaleString("vi-VN")}đ
              </span>
              <span className="text-xs text-gray-400">/{product.unit}</span>
              {product.originalPrice && (
                <span className="text-xs text-gray-400 line-through ml-auto">
                  {product.originalPrice.toLocaleString("vi-VN")}đ
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={product.stock === 0}
              className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                added
                  ? "bg-green-500 text-white"
                  : "bg-green-50 hover:bg-green-600 text-green-700 hover:text-white border border-green-200 hover:border-green-600"
              }`}
            >
              {added ? t("product.added") : t("product.addToCart")}
            </button>
          </div>
        </div>
      </Link>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => addToCart(product)}
        />
      )}
    </>
  );
});

export default ProductCard;
