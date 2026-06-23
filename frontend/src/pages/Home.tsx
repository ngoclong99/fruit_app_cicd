import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProductCard from "@/components/user/ui/Card/ProductCard";
import { productsApi } from "@/api/endpoints/products";
import { categoriesApi } from "@/api/endpoints/categories";
import type { Product, Category } from "@/types";
import { getProductName } from "@/utils/product";

export default function Home() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    productsApi
      .list({ limit: 100 })
      .then((r) => setProducts(r.data))
      .catch(() => {});
    categoriesApi
      .list()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const sale = useMemo(
    () => products.filter((p) => p.badge === "sale").slice(0, 4),
    [products],
  );

  const filtered = useMemo(
    () =>
      activeTab === "all"
        ? products.slice(0, 8)
        : products.filter((p) => p.category === activeTab).slice(0, 8),
    [activeTab, products],
  );

  const handleTabChange = useCallback((tab: string) => setActiveTab(tab), []);

  const BENEFITS = useMemo(
    () => [
      {
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ),
        title: t("home.benefitFreshTitle"),
        desc: t("home.benefitFreshDesc"),
        color: "text-green-600 bg-green-100",
      },
      {
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        ),
        title: t("home.benefitFastTitle"),
        desc: t("home.benefitFastDesc"),
        color: "text-orange-600 bg-orange-100",
      },
      {
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        title: t("home.benefitQualityTitle"),
        desc: t("home.benefitQualityDesc"),
        color: "text-blue-600 bg-blue-100",
      },
      {
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        title: t("home.benefitPriceTitle"),
        desc: t("home.benefitPriceDesc"),
        color: "text-purple-600 bg-purple-100",
      },
    ],
    [t],
  );

  return (
    <div className="overflow-x-hidden ">
      <section className="bg-linear-to-br from-green-800 via-green-700 to-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
                {t("home.heroTitle1")}
                <br />
                <span className="text-yellow-300">{t("home.heroTitle2")}</span>
                <br />
                {t("home.heroTitle3")}
              </h1>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/products"
                  className="bg-white text-green-700 font-bold px-6 py-3 rounded-xl hover:bg-yellow-50 transition-colors shadow-md text-sm"
                >
                  {t("home.shopBtn")}
                </Link>
                <Link
                  to="/products?cat=gio-qua"
                  className="border-2 border-white/50 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
                >
                  {t("home.giftBtn")}
                </Link>
              </div>
            </div>

            <div className="hidden md:grid grid-cols-2 gap-3">
              {products.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  to={`/products/${p.id}`}
                  className="bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-2xl overflow-hidden transition-colors group"
                >
                  <img
                    src={p.image}
                    alt={getProductName(p, i18n.language)}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="p-2.5">
                    <p className="text-white text-xs font-semibold truncate">
                      {getProductName(p, i18n.language)}
                    </p>
                    <p className="text-yellow-300 text-sm font-bold mt-0.5">
                      {p.price.toLocaleString("vi-VN")}đ
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${b.color}`}
                >
                  {b.icon}
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">
                    {b.title}
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5 leading-snug hidden sm:block">
                    {b.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-red-50 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-800">
              <span className="text-red-500">🏷️</span> {t("home.sale")}
            </h2>
            <Link
              to="/products"
              className="text-green-600 text-sm font-medium hover:underline"
            >
              {t("common.viewAll")}
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sale.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {t("home.allProducts")}
          </h2>
        </div>
        <div className="flex gap-2 flex-wrap mb-6 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => handleTabChange("all")}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "bg-green-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"
            }`}
          >
            {t("common.all")}
          </button>
          {categories
            .filter((c) => !c.parentId && c.slug !== "nuoc-ep")
            .map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleTabChange(cat.slug)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === cat.slug
                    ? "bg-green-600 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="text-center my-8">
          <Link
            to="/products"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors shadow-sm"
          >
            {t("home.viewAllProducts")}
          </Link>
        </div>
      </section>
    </div>
  );
}
