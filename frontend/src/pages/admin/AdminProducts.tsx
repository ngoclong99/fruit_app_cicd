import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import type { Product, Category } from '@/types';
import { productsApi } from '@/api/endpoints/products';
import { categoriesApi } from '@/api/endpoints/categories';
import { uploadImage } from '@/api/endpoints/uploads';
import { useDebounce } from '@/hooks/useDebounce';
import { useDialog } from '@/context/DialogContext';

type FormState = {
  nameVi: string; nameEn: string; nameKey: string;
  price: string; unit: string; category: string;
  origin: string; stock: string; description: string; image: string;
};

const EXCEL_HEADERS = ['ID', 'Tên sản phẩm', 'Giá (đ)', 'Đơn vị', 'Xuất xứ', 'Tồn kho', 'Danh mục', 'Đánh giá', 'Lượt đánh giá', 'Mô tả', 'URL hình ảnh'];

function exportToExcel(products: Product[]) {
  const rows = products.map((p) => ({
    'ID': p.id,
    'Tên sản phẩm': p.nameVi ?? p.name,
    'Giá (đ)': p.price,
    'Đơn vị': p.unit,
    'Xuất xứ': p.origin,
    'Tồn kho': p.stock,
    'Danh mục': p.category,
    'Đánh giá': p.rating,
    'Lượt đánh giá': p.reviewCount,
    'Mô tả': p.description,
    'URL hình ảnh': p.image,
  }));
  const ws = XLSX.utils.json_to_sheet(rows, { header: EXCEL_HEADERS });
  ws['!cols'] = [8, 30, 12, 10, 15, 8, 15, 8, 12, 40, 50].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sản phẩm');
  XLSX.writeFile(wb, `san-pham-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function parseImportedSheet(wb: XLSX.WorkBook): Omit<Product, 'id'>[] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  return rows
    .filter((r) => r['Tên sản phẩm'])
    .map((r) => ({
      name: String(r['Tên sản phẩm'] ?? ''),
      price: Number(r['Giá (đ)'] ?? 0),
      unit: String(r['Đơn vị'] ?? 'kg'),
      origin: String(r['Xuất xứ'] ?? ''),
      stock: Number(r['Tồn kho'] ?? 0),
      category: String(r['Danh mục'] ?? 'trong-nuoc'),
      rating: Number(r['Đánh giá'] ?? 5),
      reviewCount: Number(r['Lượt đánh giá'] ?? 0),
      description: String(r['Mô tả'] ?? ''),
      image: String(r['URL hình ảnh'] ?? 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=400&fit=crop'),
    }));
}

const EMPTY_FORM: FormState = {
  nameVi: '', nameEn: '', nameKey: '',
  price: '', unit: 'kg', category: 'trong-nuoc',
  origin: '', stock: '', description: '', image: '',
};

export default function AdminProducts() {
  const { t } = useTranslation();
  const { confirm, alert } = useDialog();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchRaw, setSearchRaw] = useState('');
  const search = useDebounce(searchRaw, 250);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageMode, setImageMode] = useState<'url' | 'file'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      productsApi.list({ limit: 1000 }),
      categoriesApi.tree(),
    ]).then(([pr, cats]) => {
      setProducts(pr.data);
      setCategories(cats);
    }).catch(() => {}).finally(() => setLoadingData(false));
  }, []);

  const filtered = useMemo(() => products.filter((p) =>
    (p.nameVi ?? p.name).toLowerCase().includes(search.toLowerCase()) &&
    (activeCategory === 'all' || p.category === activeCategory) &&
    (stockFilter === 'all' || (stockFilter === 'in' ? p.stock > 0 : p.stock === 0))
  ), [products, search, activeCategory, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    const addCount = (cats: typeof categories) => {
      cats.forEach((c) => {
        counts[c.slug] = products.filter((p) => p.category === c.slug).length;
        if (c.children) addCount(c.children);
      });
    };
    addCount(categories);
    return counts;
  }, [products, categories]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const imageVal = form.image;
    // Lỗi API được alert toàn cục bởi axios interceptor — chỉ cần xử lý success.
    if (editProduct) {
      const data: Partial<Product> = {
        nameVi: form.nameVi, nameEn: form.nameEn, nameKey: form.nameKey,
        price: Number(form.price), unit: form.unit, category: form.category,
        origin: form.origin, stock: Number(form.stock), description: form.description,
        ...(imageVal ? { image: imageVal } : {}),
      };
      productsApi.update(editProduct.id, data)
        .then((updated) => {
          setProducts((prev) => prev.map((p) => p.id === editProduct.id ? updated : p));
          setShowForm(false);
          setEditProduct(null);
          setForm(EMPTY_FORM);
        })
        .catch(() => {});
    } else {
      const data: Omit<Product, 'id'> = {
        name: form.nameVi, nameVi: form.nameVi, nameEn: form.nameEn, nameKey: form.nameKey,
        price: Number(form.price), unit: form.unit, category: form.category,
        origin: form.origin, stock: Number(form.stock), description: form.description,
        image: imageVal || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=400&fit=crop',
        rating: 5, reviewCount: 0,
      };
      productsApi.create(data)
        .then((created) => {
          setProducts((prev) => [created, ...prev]);
          setShowForm(false);
          setEditProduct(null);
          setForm(EMPTY_FORM);
        })
        .catch(() => {});
    }
  }, [editProduct, form]);

  const handleEdit = useCallback((p: Product) => {
    setEditProduct(p);
    setForm({ nameVi: p.nameVi ?? p.name, nameEn: p.nameEn ?? '', nameKey: p.nameKey ?? '', price: String(p.price), unit: p.unit, category: p.category, origin: p.origin, stock: String(p.stock), description: p.description, image: p.image });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({ title: t('admin.deleteConfirm'), body: t('admin.deleteConfirmBody'), type: 'danger', confirmText: t('common.delete'), cancelText: t('common.cancel') });
    if (!ok) return;
    productsApi.remove(id)
      .then(() => {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
      })
      .catch(() => {});
  }, [t, confirm]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }, []);

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (filtered.every((p) => s.has(p.id))) { filtered.forEach((p) => s.delete(p.id)); }
      else { filtered.forEach((p) => s.add(p.id)); }
      return s;
    });
  }, [filtered]);

  const handleBulkDelete = useCallback(async () => {
    if (selected.size === 0) return;
    const ok = await confirm({ title: t('admin.bulkDelete', { count: selected.size }), body: t('admin.bulkDeleteConfirm', { count: selected.size }), type: 'danger', confirmText: t('common.delete'), cancelText: t('common.cancel') });
    if (!ok) return;
    const ids = [...selected];
    productsApi.bulkDelete(ids)
      .then(() => {
        setProducts((prev) => prev.filter((p) => !selected.has(p.id)));
        setSelected(new Set());
      })
      .catch(() => {});
  }, [selected, t, confirm]);

  const f = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const parsed = parseImportedSheet(wb);
      let skipped = 0;
      const existingNames = new Set(products.map((p) => p.name.toLowerCase()));
      const toCreate = parsed.filter((item) => {
        if (existingNames.has(item.name.toLowerCase())) { skipped++; return false; }
        return true;
      });
      if (toCreate.length === 0) {
        setImportResult({ added: 0, skipped });
        setTimeout(() => setImportResult(null), 4000);
        return;
      }
      productsApi.bulkCreate(toCreate)
        .then((res) => {
          setProducts((prev) => [...res.data, ...prev]);
          setImportResult({ added: res.created, skipped });
          setTimeout(() => setImportResult(null), 4000);
        })
        .catch(() => {});
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }, [products]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingImage(true);
    try {
      const publicUrl = await uploadImage(file);
      setForm((prev) => ({ ...prev, image: publicUrl }));
    } catch (err) {
      alert({ title: t('admin.uploadFailed'), body: (err as Error).message, type: 'danger' });
    } finally {
      setUploadingImage(false);
    }
  }, [alert, t]);

  if (loadingData) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-gray-400 hover:text-gray-600">{t('admin.back')}</Link>
          <h1 className="text-2xl font-bold text-gray-800">{t('admin.titleProducts')}</h1>
        </div>
        <div className="flex gap-2">
          <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" title={t('admin.importExcel')} />
          <button type="button" onClick={() => importInputRef.current?.click()}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-4 py-2 rounded-lg transition text-sm flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {t('admin.importExcel')}
          </button>
          <button type="button" onClick={() => exportToExcel(products)}
            className="border border-green-600 text-green-700 hover:bg-green-50 font-semibold px-4 py-2 rounded-lg transition text-sm flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {t('admin.exportExcel')}
          </button>
          <button type="button" onClick={() => { setShowForm(true); setEditProduct(null); setForm(EMPTY_FORM); setImageMode('url'); }}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition text-sm">
            {t('admin.addProduct')}
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[{ slug: 'all', name: t('common.all'), icon: '🛍️' }, ...categories.filter((c) => !c.parentId)].map((c) => {
          const slug = 'slug' in c ? c.slug : 'all';
          const count = categoryCounts[slug] ?? 0;
          const active = activeCategory === slug;
          return (
            <button key={slug} type="button" onClick={() => { setActiveCategory(slug); setSelected(new Set()); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition border ${active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700'}`}>
              <span>{c.icon}</span>
              <span>{c.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <input type="text" value={searchRaw} onChange={(e) => { setSearchRaw(e.target.value); setPage(1); }}
          placeholder={t('admin.searchProduct')}
          className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-500" />
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
          {(['all', 'in', 'out'] as const).map((s) => (
            <button key={s} type="button"
              onClick={() => { setStockFilter(s); setPage(1); }}
              className={`px-3 py-2 font-medium transition ${stockFilter === s
                ? s === 'out' ? 'bg-red-500 text-white' : 'bg-green-600 text-white'
                : 'text-gray-500 hover:bg-gray-50'}`}>
              {t(`admin.stock${s.charAt(0).toUpperCase() + s.slice(1)}`)}
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <button type="button" onClick={handleBulkDelete}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            {t('admin.bulkDelete', { count: selected.size })}
          </button>
        )}
        {importResult && (
          <span className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
            {t('admin.importSuccess', { added: importResult.added, skipped: importResult.skipped })}
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 w-8" aria-label={t('admin.selectAll')}>
                  <input type="checkbox" title={t('admin.selectAll')} checked={allFilteredSelected} onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('admin.productName')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('admin.price')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('admin.stock')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('admin.category')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('admin.rating')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id} className={`border-b last:border-0 hover:bg-gray-50 ${selected.has(p.id) ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" title={p.name} checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-medium text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">📍 {p.origin}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-700">{p.price.toLocaleString('vi-VN')}đ/{p.unit}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.stock > 20 ? 'bg-green-100 text-green-700' : p.stock > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{p.category}</td>
                  <td className="px-4 py-3"><span className="text-yellow-500">★</span> {p.rating} ({p.reviewCount})</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleEdit(p)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">{t('common.edit')}</button>
                      <button type="button" onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 text-xs font-medium">{t('common.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
            <span>{t('admin.pageInfo', { from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, filtered.length), total: filtered.length })}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
              <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | '...')[]>((acc, n, i, arr) => {
                  if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === '...' ? <span key={`e${i}`} className="px-2">…</span> : (
                    <button key={n} type="button" onClick={() => setPage(n as number)}
                      className={`w-8 h-8 rounded font-medium transition ${page === n ? 'bg-green-600 text-white' : 'hover:bg-gray-100'}`}>
                      {n}
                    </button>
                  )
                )}
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}
                className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">›</button>
              <button type="button" onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editProduct ? t('admin.editProduct') : t('admin.addProductTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('admin.productNameVi')}</label>
                  <input required value={form.nameVi} onChange={f('nameVi')} placeholder="Tên tiếng Việt"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('admin.productNameEn')}</label>
                  <input value={form.nameEn} onChange={f('nameEn')} placeholder="English name"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('admin.productNameKey')}</label>
                  <input value={form.nameKey} onChange={f('nameKey')} placeholder="product_key"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('admin.productPrice')}</label>
                  <input required type="number" value={form.price} onChange={f('price')} placeholder="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('admin.productUnit')}</label>
                  <input value={form.unit} onChange={f('unit')} placeholder={t('admin.productUnitPlaceholder')}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('admin.productOrigin')}</label>
                  <input value={form.origin} onChange={f('origin')} placeholder={t('admin.productOriginPlaceholder')}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('admin.productStock')}</label>
                  <input type="number" value={form.stock} onChange={f('stock')} placeholder="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('admin.category')}</label>
                  <select title={t('admin.category')} value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    {categories.flatMap((l1) => [
                      <optgroup key={l1.id} label={`${l1.icon} ${l1.name}`}>
                        <option value={l1.slug}>{l1.icon} {l1.name}</option>
                        {(l1.children ?? []).flatMap((l2) => [
                          <option key={l2.id} value={l2.slug}>　{l2.icon} {l2.name}</option>,
                          ...(l2.children ?? []).map((l3) => (
                            <option key={l3.id} value={l3.slug}>　　{l3.icon} {l3.name}</option>
                          )),
                        ])}
                      </optgroup>,
                    ])}
                  </select>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">{t('admin.productImage')}</label>
                    <div className="flex rounded-md overflow-hidden border border-gray-200 text-xs">
                      <button type="button" onClick={() => setImageMode('url')}
                        className={`px-2 py-0.5 transition ${imageMode === 'url' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        URL
                      </button>
                      <button type="button" onClick={() => { setImageMode('file'); fileInputRef.current?.click(); }}
                        className={`px-2 py-0.5 transition ${imageMode === 'file' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        {t('admin.uploadImage')}
                      </button>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" title={t('admin.uploadImage')} />
                  {imageMode === 'url' ? (
                    <input value={form.image} onChange={f('image')} placeholder={t('admin.productImagePlaceholder')}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  ) : (
                    <div
                      onClick={() => !uploadingImage && fileInputRef.current?.click()}
                      className={`w-full border-2 border-dashed rounded-lg px-3 py-3 text-sm text-center transition ${uploadingImage ? 'border-gray-200 bg-gray-50 cursor-wait' : 'border-gray-200 cursor-pointer hover:border-green-400 hover:bg-green-50'}`}>
                      {uploadingImage ? (
                        <span className="text-xs text-gray-500 inline-flex items-center gap-2">
                          <span className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                          {t('admin.uploading')}
                        </span>
                      ) : form.image ? (
                        <div className="flex items-center gap-3">
                          <img src={form.image} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                          <span className="text-xs text-gray-500 truncate">{t('admin.imageSelected')}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">{t('admin.uploadImageHint')}</span>
                      )}
                    </div>
                  )}
                  {form.image && (
                    <img src={form.image} alt="" className="mt-1.5 w-10 h-10 rounded object-cover border" />
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{t('admin.productDesc')}</label>
                  <textarea value={form.description} onChange={f('description')} placeholder={t('admin.productDescPlaceholder')}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 h-20 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition">
                  {editProduct ? t('common.update') : t('common.add')}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition">
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
