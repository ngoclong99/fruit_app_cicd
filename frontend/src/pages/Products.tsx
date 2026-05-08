import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { categoriesApi } from "../api/endpoints/categories";
import { productsApi } from "../api/endpoints/products";
import ProductCard from "../components/user/ui/Card/ProductCard";
import { useDebounce } from "../hooks/useDebounce";
import type { Category, Product } from "../types";

const VALID_SORTS = ["default", "price-asc", "price-desc", "rating", "newest"];

function parsePriceRange(raw: string | null): [number, number] {
  if (!raw) return [0, 1000000];
  const parts = raw.split("-");
  if (parts.length !== 2) return [0, 1000000];
  const min = Number(parts[0]);
  const max = Number(parts[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 10000000 || min > max)
    return [0, 1000000];
  return [min, max];
}

function findCatPath(tree: Category[], slug: string): Category[] {
  for (const l1 of tree) {
    if (l1.slug === slug) return [l1];
    for (const l2 of l1.children ?? []) {
      if (l2.slug === slug) return [l1, l2];
      for (const l3 of l2.children ?? []) {
        if (l3.slug === slug) return [l1, l2, l3];
      }
    }
  }
  return [];
}

const PRICE_PRESETS: [number, number][] = [
  [0, 100000],
  [100000, 300000],
  [300000, 600000],
  [600000, 1000000],
];

interface FilterPanelProps {
  catPath: Category[];
  cat: string;
  onCatClick: (slug: string) => void;
  priceRange: [number, number];
  onPriceRange: (min: number, max: number) => void;
  t: (key: string) => string;
}

function FilterPanel({ catPath, cat, onCatClick, priceRange, onPriceRange, t }: FilterPanelProps) {
  const activeL1 = catPath[0];
  const activeL2 = catPath[1];

  const isActive = (slug: string) => cat === slug;
  const btnBase = "px-2.5 py-1.5 rounded-full text-xs font-medium transition border";
  const btnOn = `${btnBase} bg-green-600 text-white border-green-600`;
  const btnOff = `${btnBase} bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700`;

  return (
    <div className="space-y-5">
      {/* Category */}
      {activeL1 && (activeL1.children?.length ?? 0) > 0 && (
      <div>
        {/* <h3 className="font-semibold text-gray-700 mb-2.5">{t("products.filterCategory")}</h3> */}

        {/* L2 */}
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {activeL1.icon} {activeL1.name}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => onCatClick(activeL1.slug)}
            className={isActive(activeL1.slug) ? btnOn : btnOff}>
            {t("common.all")}
          </button>
          {activeL1.children!.map((c) => (
            <button type="button" key={c.id} onClick={() => onCatClick(c.slug)}
              className={activeL2?.slug === c.slug || isActive(c.slug) ? btnOn : btnOff}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {/* L3 */}
        {activeL2 && (activeL2.children?.length ?? 0) > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {activeL2.icon} {activeL2.name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => onCatClick(activeL2.slug)}
                className={isActive(activeL2.slug) ? btnOn : btnOff}>
                {t("common.all")}
              </button>
              {activeL2.children!.map((c) => (
                <button type="button" key={c.id} onClick={() => onCatClick(c.slug)}
                  className={isActive(c.slug) ? btnOn : btnOff}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Price */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2.5">{t("products.filterPrice")}</h3>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map(([min, max]) => {
            const label = min === 0 ? t("products.price1")
              : min === 100000 ? t("products.price2")
              : min === 300000 ? t("products.price3")
              : t("products.price4");
            const active = priceRange[0] === min && priceRange[1] === max;
            return (
              <button type="button" key={min} onClick={() => onPriceRange(min, max)}
                className={active ? btnOn : btnOff}>
                {label}
              </button>
            );
          })}
          {(priceRange[0] !== 0 || priceRange[1] !== 1000000) && (
            <button type="button" onClick={() => onPriceRange(0, 1000000)}
              className="px-2.5 py-1.5 rounded-full text-xs text-gray-400 hover:text-red-500 transition">
              {t("products.clearFilter")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const cat = searchParams.get("cat") ?? "";
  const sort = VALID_SORTS.includes(searchParams.get("sort") ?? "") ? (searchParams.get("sort") as string) : "default";
  const priceRange = useMemo<[number, number]>(() => parsePriceRange(searchParams.get("price")), [searchParams]);

  const [searchRaw, setSearchRaw] = useState(() => searchParams.get("q") ?? "");
  const search = useDebounce(searchRaw, 300);

  const [products, setProducts] = useState<Product[]>([]);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);

  // Pending state for drawer (apply on confirm)
  const [pendingCat, setPendingCat] = useState(cat);
  const [pendingPrice, setPendingPrice] = useState<[number, number]>(priceRange);

  const filteredTree = useMemo(() => categoryTree.filter((c) => c.slug !== "nuoc"), [categoryTree]);

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

  const openDrawer = useCallback(() => {
    setPendingCat(cat);
    setPendingPrice(priceRange);
    setDrawerOpen(true);
  }, [cat, priceRange]);

  const applyDrawer = useCallback(() => {
    updateParams({
      cat: pendingCat || null,
      price: pendingPrice[0] === 0 && pendingPrice[1] === 1000000 ? null : `${pendingPrice[0]}-${pendingPrice[1]}`,
      types: null,
    });
    setDrawerOpen(false);
  }, [pendingCat, pendingPrice, updateParams]);

  const clearDrawer = useCallback(() => {
    setPendingCat("");
    setPendingPrice([0, 1000000]);
  }, []);

  useEffect(() => {
    updateParams({ q: search || null });
  }, [search, updateParams]);

  const sortParam =
    sort === "price-asc" ? "price_asc"
    : sort === "price-desc" ? "price_desc"
    : sort !== "default" ? sort
    : undefined;

  const fetchKey = `${cat}|${search}|${sortParam ?? ""}`;
  const [completedKey, setCompletedKey] = useState(fetchKey);
  const loading = completedKey !== fetchKey;

  useEffect(() => {
    const key = `${cat}|${search}|${sortParam ?? ""}`;
    productsApi
      .list({ category: cat || undefined, search: search || undefined, sort: sortParam, limit: 100 })
      .then((r) => { setProducts(r.data); setCompletedKey(key); })
      .catch(() => { setProducts([]); setCompletedKey(key); });
  }, [cat, search, sortParam]);

  useEffect(() => {
    categoriesApi.tree().then(setCategoryTree).catch(() => {});
  }, []);

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const SORT_OPTIONS = useMemo(() => [
    { value: "default", label: t("products.sortDefault") },
    { value: "price-asc", label: t("products.sortPriceAsc") },
    { value: "price-desc", label: t("products.sortPriceDesc") },
    { value: "rating", label: t("products.sortRating") },
    { value: "newest", label: t("products.sortNewest") },
  ], [t]);

  const filtered = useMemo(
    () => products.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]),
    [products, priceRange],
  );

  const catPath = useMemo(() => findCatPath(filteredTree, cat), [filteredTree, cat]);
  const pendingCatPath = useMemo(() => findCatPath(filteredTree, pendingCat), [filteredTree, pendingCat]);

  const handleCatClick = useCallback(
    (slug: string) => { updateParams({ cat: slug && slug !== cat ? slug : null }); },
    [updateParams, cat],
  );

  const handlePriceRange = useCallback(
    (min: number, max: number) => {
      updateParams({ price: min === 0 && max === 1000000 ? null : `${min}-${max}` });
    },
    [updateParams],
  );

  const isPriceDefault = priceRange[0] === 0 && priceRange[1] === 1000000;
  const appliedFilterCount = (cat ? 1 : 0) + (isPriceDefault ? 0 : 1);

  const isPendingPriceDefault = pendingPrice[0] === 0 && pendingPrice[1] === 1000000;
  const pendingFilterCount = (pendingCat ? 1 : 0) + (isPendingPriceDefault ? 0 : 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
      {/* L1 tabs */}
      <div className="flex gap-2 flex-wrap pb-2 mb-4 scrollbar-hide">
        {filteredTree.map((c) => (
          <button type="button" key={c.id} onClick={() => handleCatClick(c.slug)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${catPath[0]?.slug === c.slug ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700"}`}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {catPath.length > 0 ? catPath.map((c) => `${c.icon} ${c.name}`).join(" › ") : t("products.allProducts")}
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">{t("products.count", { count: filtered.length })}</p>
          </div>
          <button type="button" onClick={openDrawer}
            className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            {t("products.filterBtn")}
            {appliedFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">
                {appliedFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="lg:hidden relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={searchRaw} onChange={(e) => setSearchRaw(e.target.value)}
            placeholder={t("products.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="hidden lg:block lg:w-64 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm p-4 sticky top-24">
            <FilterPanel
              catPath={catPath}
              cat={cat}
              onCatClick={handleCatClick}
              priceRange={priceRange}
              onPriceRange={handlePriceRange}
              t={t}
            />
          </div>
        </aside>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{t("products.showing", { count: filtered.length })}</p>
            <select aria-label={t("products.sortDefault")} value={sort}
              onChange={(e) => updateParams({ sort: e.target.value === "default" ? null : e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-lg font-medium">{t("products.notFound")}</p>
              <p className="text-sm mt-1">{t("products.notFoundHint")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer — pending state, apply on confirm */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${drawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setDrawerOpen(false)} />
        <div className={`absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col transition-transform duration-300 ease-out ${drawerOpen ? "translate-y-0" : "translate-y-full"}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <span className="font-semibold text-gray-800">{t("products.filterTitle")}</span>
              <div className="flex items-center gap-3">
                {pendingFilterCount > 0 && (
                  <button type="button" onClick={clearDrawer} className="text-xs text-red-500 hover:text-red-600 font-medium">
                    {t("products.clearAllFilters")}
                  </button>
                )}
                <button type="button" onClick={() => setDrawerOpen(false)}
                  title={t("products.filterClose")} aria-label={t("products.filterClose")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4">
              <FilterPanel
                catPath={pendingCatPath}
                cat={pendingCat}
                onCatClick={setPendingCat}
                priceRange={pendingPrice}
                onPriceRange={(min, max) => setPendingPrice([min, max])}
                t={t}
              />
            </div>

            <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-3">
              <button type="button" onClick={() => setDrawerOpen(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm transition hover:bg-gray-50">
                {t("common.cancel")}
              </button>
              <button type="button" onClick={applyDrawer}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition">
                {t("common.apply")}
              </button>
            </div>
          </div>
        </div>
    </div>
  );
}
