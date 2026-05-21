import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { statsApi, type StatsResponse, type TopProductItem } from '../../api/endpoints/stats';
import { ordersApi } from '../../api/endpoints/orders';
import type { Order } from '../../types';
import SalesChart from '../../components/admin/ui/SalesChart';

const STATUS_COLOR: Record<string, string> = {
  delivered: 'bg-green-100 text-green-700',
  shipping: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-blue-100 text-blue-700',
  pending: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};


export default function AdminDashboard() {
  const { t } = useTranslation();
  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending: t('admin.pending'), confirmed: t('admin.confirmed'),
      shipping: t('admin.shipping'), delivered: t('admin.delivered'), cancelled: t('admin.cancelled'),
    };
    return map[s] ?? s;
  };
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<StatsResponse | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [dayOrders, setDayOrders] = useState<Order[]>([]);
  const [dayLoading, setDayLoading] = useState(false);

  useEffect(() => {
    statsApi.get().then(setStatsData).catch(() => {});
    statsApi.getTopProducts(5).then(setTopProducts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDate) { setDayOrders([]); return; }
    setDayLoading(true);
    ordersApi.list({ from: selectedDate, to: selectedDate, limit: 100 })
      .then((r) => setDayOrders(r.data))
      .catch(() => setDayOrders([]))
      .finally(() => setDayLoading(false));
  }, [selectedDate]);

  const stats = useMemo(() => [
    { icon: '📦', label: t('admin.statsProducts'), value: statsData?.totalProducts ?? '—', color: 'bg-blue-50 text-blue-700' },
    { icon: '🛍️', label: t('admin.statsOrders'), value: statsData?.totalOrders ?? '—', color: 'bg-orange-50 text-orange-700' },
    { icon: '👥', label: t('admin.statsUsers'), value: statsData?.totalUsers ?? '—', color: 'bg-purple-50 text-purple-700' },
    { icon: '💰', label: t('admin.statsRevenue'), value: statsData ? `${statsData.totalRevenue.toLocaleString('vi-VN')}đ` : '—', color: 'bg-green-50 text-green-700' },
  ], [t, statsData]);

  const manageCards = useMemo(() => [
    { to: '/admin/products', icon: '🥝', label: t('admin.manageProducts'), desc: t('admin.manageProductsDesc') },
    { to: '/admin/orders', icon: '📋', label: t('admin.manageOrders'), desc: t('admin.manageOrdersDesc') },
    { to: '/admin/users', icon: '👥', label: t('admin.manageUsers'), desc: t('admin.manageUsersDesc') },
  ], [t]);

  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('admin.title')}</h1>
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">{t('admin.backHome')}</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`${s.color} rounded-2xl p-5`}>
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm opacity-80 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {manageCards.map((item) => (
          <Link key={item.to} to={item.to} className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition group">
            <div className="text-3xl mb-3">{item.icon}</div>
            <div className="font-bold text-gray-800 group-hover:text-green-700 transition">{item.label}</div>
            <div className="text-sm text-gray-500 mt-1">{item.desc}</div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">🏆 {t('admin.topProducts')}</h2>
        </div>
        {topProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">{t('admin.topProductsNone')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {topProducts.map((p, i) => (
              <div key={p.productId} className="border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                <span className="text-lg font-bold text-gray-300 w-6 shrink-0">#{i + 1}</span>
                {p.image && (
                  <img src={p.image} alt={p.name} loading="lazy" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{t('admin.soldCount', { count: p.quantity })}</p>
                  <p className="text-xs font-bold text-green-700">{p.revenue.toLocaleString('vi-VN')}đ</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="min-h-105">
          <SalesChart onDaySelect={setSelectedDate} selectedDate={selectedDate ?? undefined} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col">
          {selectedDate ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-gray-800">{t('admin.dayOrdersTitle', { date: fmtDate(selectedDate) })}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t('admin.dayOrdersCount', { count: dayOrders.length })}</p>
                </div>
                <button type="button" onClick={() => setSelectedDate(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2 py-1">✕</button>
              </div>

              {dayLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-6 h-6 border-3 border-green-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : dayOrders.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">{t('admin.noOrdersForDay')}</div>
              ) : (
                <div className="overflow-auto flex-1 space-y-2">
                  {dayOrders.map((order) => (
                    <div key={order.id} className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-gray-700">{order.id}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {statusLabel(order.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>📍 {order.address}</span>
                        <span className="font-bold text-green-700">{order.total.toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {order.items.slice(0, 3).map(({ product, quantity }) => (
                          <span key={product.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full truncate max-w-28">
                            {product.name} ×{quantity}
                          </span>
                        ))}
                        {order.items.length > 3 && (
                          <span className="text-xs text-gray-400">+{order.items.length - 3}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between text-sm font-bold text-gray-700">
                    <span>{t('admin.dayOrdersTotal', { count: dayOrders.length })}</span>
                    <span className="text-green-700">{dayOrders.reduce((s, o) => s + o.total, 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
              </svg>
              <p className="text-sm">{t('admin.chartHint1')}</p>
              <p className="text-xs">{t('admin.chartHint2')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
