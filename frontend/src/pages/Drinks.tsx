import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getProductName } from "@/utils/product";
import { useSearchParams } from "react-router-dom";
import { categoriesApi } from "@/api/endpoints/categories";
import { productsApi } from "@/api/endpoints/products";
import ProductCard from "@/components/user/ui/Card/ProductCard";
import { useDebounce } from "@/hooks/useDebounce";
import type { Category, Product } from "@/types";

const VALID_SORTS = ["default", "price-asc", "price-desc", "rating", "newest"];

function parseSubs(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function Drinks() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState("");

  const selectedSubs = useMemo(() => parseSubs(searchParams.get("subs")), [searchParams]);
  const sort = VALID_SORTS.includes(searchParams.get("sort") ?? "")
    ? (searchParams.get("sort") as string)
    : "default";

  const [searchRaw, setSearchRaw] = useState(() => searchParams.get("q") ?? "");
  const search = useDebounce(searchRaw, 300);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(updates)) {
          if (v === null || v === "") next.delete(k);
          else next.set(k, v);
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    updateParams({ q: search || null });
  }, [search, updateParams]);

  useEffect(() => {
    categoriesApi.tree().then((tree) => {
      const nuoc = tree.find((c) => c.slug === "nuoc-ep");
      setSubCategories(nuoc?.children ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    productsApi
      .list({ category: "nuoc-ep", limit: 200 })
      .then((r) => setAllProducts(r.data))
      .catch(() => setAllProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const sortParam =
    sort === "price-asc" ? "price_asc"
    : sort === "price-desc" ? "price_desc"
    : sort !== "default" ? sort
    : undefined;

  const filtered = useMemo(() => {
    let list = [...allProducts];

    if (selectedSubs.length > 0) {
      list = list.filter((p) => selectedSubs.includes(p.category));
    }

    if (search.length >= 1) {
      list = list.filter((p) => getProductName(p, i18n.language).toLowerCase().includes(search.toLowerCase()));
    }

    if (sortParam === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sortParam === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sortParam === "rating") list.sort((a, b) => b.rating - a.rating);

    return list;
  }, [allProducts, selectedSubs, search, sortParam]);

  const toggleSub = useCallback(
    (slug: string) => {
      const next = selectedSubs.includes(slug)
        ? selectedSubs.filter((s) => s !== slug)
        : [...selectedSubs, slug];
      updateParams({ subs: next.join(",") || null });
      setTagInput("");
    },
    [selectedSubs, updateParams],
  );

  const removeSub = useCallback(
    (slug: string) => {
      const next = selectedSubs.filter((s) => s !== slug);
      updateParams({ subs: next.join(",") || null });
    },
    [selectedSubs, updateParams],
  );

  const suggestions = useMemo(
    () =>
      tagInput.trim()
        ? subCategories.filter(
            (c) =>
              c.name.toLowerCase().includes(tagInput.toLowerCase()) &&
              !selectedSubs.includes(c.slug),
          )
        : [],
    [tagInput, subCategories, selectedSubs],
  );

  const SORT_OPTIONS = useMemo(
    () => [
      { value: "default", label: t("products.sortDefault") },
      { value: "price-asc", label: t("products.sortPriceAsc") },
      { value: "price-desc", label: t("products.sortPriceDesc") },
      { value: "rating", label: t("products.sortRating") },
      { value: "newest", label: t("products.sortNewest") },
    ],
    [t],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">🥤 {t("nav.juice")}</h1>
      </div>

      {/* Tag multi-select */}
      <div className="mb-5">
        <div
          className={`flex flex-wrap gap-1.5 p-2.5 rounded-xl border bg-white transition cursor-text min-h-10 ${selectedSubs.length > 0 ? "border-green-400" : "border-gray-200"}`}
          onClick={() => tagInputRef.current?.focus()}
        >
          {selectedSubs.map((slug) => {
            const cat = subCategories.find((c) => c.slug === slug);
            return (
              <span key={slug} className="flex items-center gap-1 bg-green-600 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg">
                {cat ? `${cat.icon} ${cat.name}` : slug}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeSub(slug); }}
                  className="hover:text-green-200 leading-none ml-0.5"
                >
                  ×
                </button>
              </span>
            );
          })}
          <input
            ref={tagInputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !tagInput && selectedSubs.length > 0)
                removeSub(selectedSubs[selectedSubs.length - 1]);
            }}
            placeholder={selectedSubs.length === 0 ? t("products.filterFruitTypePlaceholder") : ""}
            className="flex-1 min-w-20 text-sm outline-none bg-transparent placeholder-gray-400"
          />
        </div>

        {suggestions.length > 0 && (
          <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {suggestions.map((s) => (
              <button key={s.slug} type="button" onClick={() => toggleSub(s.slug)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                {s.icon} {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {subCategories.filter((c) => !selectedSubs.includes(c.slug)).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleSub(c.slug)}
              className="px-2.5 py-1 rounded-full text-xs border border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-700 transition"
            >
              {c.icon} {c.name}
            </button>
          ))}
          {selectedSubs.length > 0 && (
            <button
              type="button"
              onClick={() => updateParams({ subs: null })}
              className="px-2.5 py-1 rounded-full text-xs text-gray-400 hover:text-red-500 transition"
            >
              {t("products.clearTypeFilter")}
            </button>
          )}
        </div>
      </div>

      {/* Search + sort */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchRaw}
            onChange={(e) => setSearchRaw(e.target.value)}
            placeholder={t("products.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />
        </div>
        <select
          aria-label={t("products.sortDefault")}
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value === "default" ? null : e.target.value })}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-400 mb-4">{t("products.count", { count: filtered.length })}</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-6xl mb-4">🥤</div>
          <p className="text-lg font-medium">{t("products.notFound")}</p>
          <p className="text-sm mt-1">{t("products.notFoundHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
