import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { ordersApi } from '../api/endpoints/orders';

export default function Checkout() {
  const { t } = useTranslation();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: '',
    address: '',
    note: '',
    payment: 'cod',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const shipping = total >= 300000 ? 0 : 30000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ordersApi.create({
        items,
        total: total + shipping,
        address: form.address,
        phone: form.phone,
        note: form.note,
      });
      clearCart();
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-7xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('checkout.successTitle')}</h2>
        <p className="text-gray-500 mb-2">{t('checkout.successDesc')}</p>
        <p className="text-sm text-gray-400 mb-8">{t('checkout.successHint')}</p>
        <div className="flex gap-3 justify-center">
          <Link to="/orders" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition">
            {t('checkout.viewOrders')}
          </Link>
          <Link to="/" className="border border-gray-200 text-gray-600 hover:bg-gray-50 px-6 py-3 rounded-xl transition">
            {t('checkout.home')}
          </Link>
        </div>
      </div>
    );
  }

  const PAYMENT_METHODS = [
    { value: 'cod', icon: '💵', label: t('checkout.cod') },
    { value: 'bank', icon: '🏦', label: t('checkout.bank') },
    { value: 'momo', icon: '💜', label: t('checkout.momo') },
    { value: 'vnpay', icon: '💳', label: t('checkout.vnpay') },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:pb-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('checkout.title')}</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4">{t('checkout.deliveryInfo')}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.fullName')}</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t('checkout.fullName')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.phone')}</label>
                  <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={t('checkout.phonePlaceholder')} />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address')}</label>
                <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={t('checkout.addressPlaceholder')} />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.note')}</label>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 h-20 resize-none"
                  placeholder={t('checkout.notePlaceholder')} />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4">{t('checkout.paymentMethod')}</h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <label key={method.value} className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                    form.payment === method.value ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                  }`}>
                    <input type="radio" name="payment" value={method.value} checked={form.payment === method.value}
                      onChange={(e) => setForm({ ...form, payment: e.target.value })} className="text-green-600" />
                    <span className="text-xl">{method.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition text-lg disabled:opacity-60 shadow-md">
              {loading
                ? t('checkout.processing')
                : t('checkout.orderBtn', { total: (total + shipping).toLocaleString('vi-VN') })}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 h-fit sticky top-24">
          <h3 className="font-bold text-gray-800 mb-4">{t('checkout.orderTitle', { count: items.length })}</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex gap-3 items-center">
                <img src={product.image} alt={product.name} loading="lazy" decoding="async" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{product.name}</p>
                  <p className="text-xs text-gray-400">x{quantity}</p>
                </div>
                <p className="text-xs font-bold text-gray-700 shrink-0">{(product.price * quantity).toLocaleString('vi-VN')}đ</p>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>{t('checkout.subtotal')}</span>
              <span>{total.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>{t('checkout.shipping')}</span>
              <span className={shipping === 0 ? 'text-green-600' : ''}>{shipping === 0 ? t('common.free') : `${shipping.toLocaleString('vi-VN')}đ`}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-800 text-base pt-2 border-t">
              <span>{t('checkout.total')}</span>
              <span className="text-green-700">{(total + shipping).toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
