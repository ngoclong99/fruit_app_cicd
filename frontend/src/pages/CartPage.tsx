import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useDialog } from "@/context/DialogContext";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

export default function CartPage() {
  const { t } = useTranslation();
  const { items, removeFromCart, updateQty, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const checkoutRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = checkoutRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setCheckoutVisible(entry.isIntersecting),
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const shipping = total >= 300000 ? 0 : 30000;
  const grandTotal = total + shipping;

  const handleCheckout = () => navigate(user ? "/checkout" : "/cart");

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-8xl mb-6">🛒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-3">
          {t("cart.empty")}
        </h2>
        <p className="text-gray-500 mb-6">{t("cart.emptyDesc")}</p>
        <Link
          to="/products"
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl transition"
        >
          {t("common.shopNow")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              🛒 {t("nav.cart")}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {items.length} {t("cart.itemsUnit")}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({
                body: t("cart.clearConfirm"),
                type: "danger",
                confirmText: t("common.confirm"),
                cancelText: t("common.cancel"),
              });
              if (ok) clearCart();
            }}
            className="text-sm text-red-400 hover:text-red-600 transition mt-1"
          >
            {t("cart.clearAll")}
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3 lg:max-h-121 lg:overflow-y-auto lg:pr-1 lg:scrollbar-thin lg:scrollbar-thumb-gray-200 lg:scrollbar-track-transparent">
            {items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 items-center"
              >
                <Link to={`/products/${product.id}`} className="shrink-0">
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/products/${product.id}`}
                    className="font-semibold text-gray-800 text-sm hover:text-green-700 line-clamp-2"
                  >
                    {product.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    📍 {product.origin} · {product.unit}
                  </p>
                  <p className="text-green-700 font-bold mt-1">
                    {product.price.toLocaleString("vi-VN")}đ
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button
                    type="button"
                    title={t("common.delete")}
                    onClick={() => removeFromCart(product.id)}
                    className="text-gray-300 hover:text-red-400 transition"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <div className="flex items-center border border-gray-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateQty(product.id, quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-green-700"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(product.id, quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-green-700"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-bold text-gray-700">
                    {(product.price * quantity).toLocaleString("vi-VN")}đ
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">
                {t("cart.orderSummary")}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("cart.subtotal")}</span>
                  <span className="font-medium">
                    {total.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("cart.shipping")}</span>
                  <span
                    className={`font-medium ${shipping === 0 ? "text-green-600" : ""}`}
                  >
                    {shipping === 0 ? t("common.free") : t("cart.shippingFee")}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-orange-500 bg-orange-50 p-2 rounded-lg">
                    {t("cart.shippingHint", {
                      amount: (300000 - total).toLocaleString("vi-VN"),
                    })}
                  </p>
                )}
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>{t("cart.total")}</span>
                  <span className="text-green-700">
                    {grandTotal.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>
            </div>

            <button
              ref={checkoutRef}
              type="button"
              onClick={handleCheckout}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition text-lg shadow-md"
            >
              {t("cart.checkout")}
            </button>
            <Link
              to="/products"
              className="block text-center text-green-600 hover:underline text-sm"
            >
              {t("cart.continueShopping")}
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky checkout bar — mobile only, hidden when sidebar checkout button is visible */}
      <div
        className={`lg:hidden fixed bottom-16 left-0 right-0 z-40 px-4 pb-3 pt-2 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-transform duration-200 ${checkoutVisible ? "translate-y-full" : "translate-y-0"}`}
      >
        {shipping > 0 && (
          <p className="text-xs text-orange-500 text-center mb-1.5">
            {t("cart.shippingHint", {
              amount: (300000 - total).toLocaleString("vi-VN"),
            })}
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">{t("cart.total")}</p>
            <p className="font-bold text-green-700 text-base leading-tight">
              {grandTotal.toLocaleString("vi-VN")}đ
            </p>
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            className="shrink-0 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold px-6 py-3 rounded-xl transition text-sm shadow-md"
          >
            {t("cart.checkout")}
          </button>
        </div>
      </div>
    </>
  );
}
