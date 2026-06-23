import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ordersApi } from '@/api/endpoints/orders';
import type { Order } from '@/types';

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipping: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function Orders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    ordersApi.list({ limit: 100 })
      .then((r) => setOrders(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = useCallback(async (id: string) => {
    setCancelling(id);
    try {
      const updated = await ordersApi.cancel(id);
      setOrders((prev) => prev.map((o) => o.id === id ? updated : o));
    } catch {
      /* ignore */
    } finally {
      setCancelling(null);
    }
  }, []);

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending: t('orders.pending'),
      confirmed: t('orders.confirmed'),
      shipping: t('orders.shipping'),
      delivered: t('orders.delivered'),
      cancelled: t('orders.cancelled'),
    };
    return map[s] ?? s;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('orders.title')}</h1>
      {orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-7xl mb-4">📦</div>
          <p className="text-xl font-semibold text-gray-600 mb-2">{t('orders.empty')}</p>
          <Link to="/products" className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition">
            {t('common.shopNow')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div>
                  <p className="font-bold text-gray-800 text-sm">{order.id}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {statusLabel(order.status)}
                  </span>
                  {order.status === 'pending' && (
                    <button
                      type="button"
                      disabled={cancelling === order.id}
                      onClick={() => handleCancel(order.id)}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      {cancelling === order.id ? '...' : t('orders.cancel')}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex gap-3 items-center">
                    <img src={product.image} alt={product.name} loading="lazy" decoding="async" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                      <p className="text-xs text-gray-400">x{quantity} · {product.price.toLocaleString('vi-VN')}đ/{product.unit}</p>
                    </div>
                    <p className="text-sm font-bold shrink-0">{(product.price * quantity).toLocaleString('vi-VN')}đ</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500 truncate flex-1">📍 {order.address}</p>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">{t('orders.total')}</p>
                  <p className="text-base font-bold text-green-700">{order.total.toLocaleString('vi-VN')}đ</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
