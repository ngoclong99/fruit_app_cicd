import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ordersApi } from '../../api/endpoints/orders';
import type { Order } from '../../types';

const STATUS_OPTIONS = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'] as const;
type StatusFilter = 'all' | Order['status'];
type Range = 'day' | 'week' | 'month' | 'custom';

const TODAY = new Date().toISOString().slice(0, 10);

function addDays(date: string, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function toDateStr(iso: string) {
  return iso.slice(0, 10);
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipping: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STAT_ICONS: Record<string, string> = {
  pending: '⏳',
  confirmed: '✅',
  shipping: '🚚',
  delivered: '📦',
  cancelled: '❌',
};

export default function AdminOrders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [range, setRange] = useState<Range>('month');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);
  const [customFrom, setCustomFrom] = useState(addDays(TODAY, -13));
  const [customTo, setCustomTo] = useState(TODAY);

  useEffect(() => {
    ordersApi.list({ limit: 1000 })
      .then((r) => setOrders(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const STATUS_LABELS = useMemo<Record<string, string>>(() => ({
    pending: t('admin.pending'),
    confirmed: t('admin.confirmed'),
    shipping: t('admin.shipping'),
    delivered: t('admin.delivered'),
    cancelled: t('admin.cancelled'),
  }), [t]);

  const { from, to } = useMemo(() => {
    if (range === 'day') return { from: TODAY, to: TODAY };
    if (range === 'week') return { from: addDays(TODAY, -6), to: TODAY };
    if (range === 'month') return { from: addDays(TODAY, -29), to: TODAY };
    return { from: customFrom, to: customTo };
  }, [range, customFrom, customTo]);

  const rangeOrders = useMemo(() =>
    orders.filter((o) => { const d = toDateStr(o.createdAt); return d >= from && d <= to; }),
    [orders, from, to]
  );

  const stats = useMemo(() => {
    const total = rangeOrders.length;
    const revenue = rangeOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
    const counts = STATUS_OPTIONS.reduce<Record<string, number>>((acc, s) => {
      acc[s] = rangeOrders.filter((o) => o.status === s).length;
      return acc;
    }, {});
    return { total, revenue, counts };
  }, [rangeOrders]);

  const filtered = useMemo(() =>
    rangeOrders.filter((o) =>
      (statusFilter === 'all' || o.status === statusFilter) &&
      (search === '' || o.id.toLowerCase().includes(search.toLowerCase()) || o.phone.includes(search) || o.address.toLowerCase().includes(search.toLowerCase()))
    ),
    [rangeOrders, statusFilter, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const updateStatus = (id: string, status: Order['status']) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    ordersApi.updateStatus(id, status).catch(() => {
      ordersApi.list({ limit: 1000 }).then((r) => setOrders(r.data)).catch(() => {});
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="text-gray-400 hover:text-gray-600">{t('admin.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-800">{t('admin.titleOrders')}</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex gap-1">
            {(['day', 'week', 'month', 'custom'] as Range[]).map((r) => (
              <button key={r} type="button" onClick={() => { setRange(r); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${range === r ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-500 hover:border-green-400'}`}>
                {r === 'day' ? t('admin.rangeDay') : r === 'week' ? t('admin.rangeWeek') : r === 'month' ? t('admin.rangeMonth') : t('admin.rangeCustom')}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" title={t('admin.dateFrom')} value={customFrom} max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
              <span className="text-xs text-gray-400">→</span>
              <input type="date" title={t('admin.dateTo')} value={customTo} min={customFrom} max={TODAY}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center col-span-1">
            <p className="text-xs text-gray-500 mb-1">{t('admin.ordersTotal')}</p>
            <p className="text-xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center col-span-1 sm:col-span-2 lg:col-span-2">
            <p className="text-xs text-gray-500 mb-1">{t('admin.statsRevenue')}</p>
            <p className="text-base font-bold text-green-700">{stats.revenue.toLocaleString('vi-VN')}đ</p>
          </div>
          {STATUS_OPTIONS.map((s) => (
            <div key={s} className={`rounded-xl p-3 text-center cursor-pointer transition border-2 ${statusFilter === s ? 'border-current' : 'border-transparent'} ${STATUS_COLORS[s]}`}
              onClick={() => { setStatusFilter(statusFilter === s ? 'all' : s); setPage(1); }}>
              <p className="text-xs mb-1">{STAT_ICONS[s]}</p>
              <p className="text-lg font-bold">{stats.counts[s]}</p>
              <p className="text-xs opacity-80">{STATUS_LABELS[s]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('admin.orderSearchPlaceholder')}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-500" />
        <div className="flex gap-1 flex-wrap">
          <button type="button" onClick={() => { setStatusFilter('all'); setPage(1); }}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${statusFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
            {t('admin.allFilter', { count: rangeOrders.length })}
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button key={s} type="button" onClick={() => { setStatusFilter(statusFilter === s ? 'all' : s); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${statusFilter === s ? `${STATUS_COLORS[s]} border-current` : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {STATUS_LABELS[s]} ({stats.counts[s]})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">{t('admin.noOrdersFound')}</div>
      ) : (
        <div className="space-y-4">
          {paginated.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div>
                  <p className="font-bold text-gray-800">{order.id}</p>
                  <p className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  <select aria-label={t('admin.updateStatus')} value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value as Order['status'])}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                {order.items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                    <img src={product.image} alt="" loading="lazy" decoding="async" className="w-8 h-8 rounded object-cover" />
                    <span className="text-xs text-gray-700">{product.name} x{quantity}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                <div className="text-gray-500 space-y-0.5">
                  <p>📞 {order.phone}</p>
                  <p>📍 {order.address}</p>
                </div>
                <p className="font-bold text-green-700 text-lg">{order.total.toLocaleString('vi-VN')}đ</p>
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-5 py-3 text-sm text-gray-500">
              <span>{t('admin.ordersPaginationInfo', { from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, filtered.length), total: filtered.length })}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30">«</button>
                <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<(number | '...')[]>((acc, n, i, arr) => { if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...'); acc.push(n); return acc; }, [])
                  .map((n, i) => n === '...' ? <span key={`e${i}`} className="px-2">…</span> : (
                    <button key={n} type="button" onClick={() => setPage(n as number)}
                      className={`w-8 h-8 rounded font-medium transition ${page === n ? 'bg-green-600 text-white' : 'hover:bg-gray-100'}`}>{n}</button>
                  ))}
                <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30">›</button>
                <button type="button" onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30">»</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
