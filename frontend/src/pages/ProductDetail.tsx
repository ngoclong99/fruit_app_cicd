import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import AuthModal from '../components/user/ui/Modal/AuthModal';
import ProductCard from '../components/user/ui/Card/ProductCard';
import { productsApi } from '../api/endpoints/products';
import type { Product } from '../types';
import { getProductName } from '../utils/product';

export default function ProductDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [showAuth, setShowAuth] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);

  const fetchKey = id ?? '';
  const [completedKey, setCompletedKey] = useState(fetchKey);
  const loading = fetchKey !== completedKey && fetchKey !== '';

  useEffect(() => {
    if (!id) return;
    setActiveImg(0);
    const key = id;
    productsApi.get(id)
      .then((p) => {
        setProduct(p);
        return productsApi.list({ category: p.category, limit: 5 });
      })
      .then((r) => setRelated(r.data.filter((p) => p.id !== id).slice(0, 4)))
      .catch(() => setProduct(null))
      .finally(() => setCompletedKey(key));
  }, [id]);

  const images = useMemo(() => product?.images ?? (product ? [product.image] : []), [product]);

  const discount = useMemo(
    () =>
      product?.originalPrice
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0,
    [product]
  );

  const handleAddToCart = useCallback(() => {
    if (!user) { setShowAuth(true); return; }
    if (!product) return;
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [user, product, qty, addToCart]);

  const displayName = product ? getProductName(product, i18n.language) : '';

  const handleBuyNow = useCallback(() => {
    if (!user) { setShowAuth(true); return; }
    if (!product) return;
    addToCart(product, qty);
    navigate('/cart');
  }, [user, product, qty, addToCart, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">😢</div>
        <p className="text-xl font-semibold text-gray-600">{t('productDetail.notFound')}</p>
        <Link to="/products" className="mt-4 inline-block text-green-600 hover:underline">
          {t('productDetail.backToProducts')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-green-600">{t('productDetail.breadHome')}</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-green-600">{t('productDetail.breadProducts')}</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium truncate max-w-xs">{displayName}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <div className="rounded-2xl overflow-hidden bg-gray-100 mb-3 aspect-square">
              <img src={images[activeImg]} alt={displayName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${displayName} ${i + 1}`}
                    onClick={() => setActiveImg(i)}
                    className={`rounded-lg overflow-hidden w-20 h-20 border-2 transition ${activeImg === i ? 'border-green-500' : 'border-transparent'}`}
                  >
                    <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">📍 {product.origin}</span>
              {product.badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase text-white ${
                  product.badge === 'hot' ? 'bg-orange-500' : product.badge === 'sale' ? 'bg-red-500' : 'bg-blue-500'
                }`}>
                  {product.badge === 'sale' ? `-${discount}%` : product.badge}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">{displayName}</h1>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex text-yellow-400">
                {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}
              </div>
              <span className="text-sm font-semibold text-gray-700">{product.rating}</span>
              <span className="text-sm text-gray-400">({t('productDetail.reviews', { count: product.reviewCount })})</span>
            </div>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-bold text-green-700">{product.price.toLocaleString('vi-VN')}đ</span>
              <span className="text-gray-400">/{product.unit}</span>
              {product.originalPrice && (
                <span className="text-gray-400 text-lg line-through">{product.originalPrice.toLocaleString('vi-VN')}đ</span>
              )}
            </div>

            {product.originalPrice && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-2 mb-4 inline-block">
                <span className="text-red-600 font-semibold text-sm">
                  {t('productDetail.save', {
                    amount: (product.originalPrice - product.price).toLocaleString('vi-VN'),
                    discount,
                  })}
                </span>
              </div>
            )}

            <div className="border-t border-b border-gray-100 py-4 mb-4 space-y-2">
              <div className="flex gap-2 text-sm">
                <span className="text-gray-500 w-32">{t('productDetail.status')}</span>
                <span className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {product.stock > 0
                    ? t('productDetail.inStock', { count: product.stock })
                    : t('productDetail.outOfStock')}
                </span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-gray-500 w-32">{t('productDetail.origin')}</span>
                <span className="font-medium text-gray-700">{product.origin}</span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-gray-500 w-32">{t('productDetail.unit')}</span>
                <span className="font-medium text-gray-700">{product.unit}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm text-gray-600 font-medium">{t('productDetail.qty')}</span>
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-green-700 text-lg font-bold">−</button>
                <span className="w-12 text-center font-semibold">{qty}</span>
                <button type="button" onClick={() => setQty(Math.min(product.stock, qty + 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-green-700 text-lg font-bold">+</button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`flex-1 py-3 rounded-xl font-semibold transition border-2 ${
                  added ? 'bg-green-500 text-white border-green-500' : 'border-green-600 text-green-700 hover:bg-green-600 hover:text-white'
                } disabled:opacity-50`}
              >
                {added ? t('productDetail.added') : t('productDetail.addToCart')}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={product.stock === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
              >
                {t('productDetail.buyNow')}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              {[
                ['🚚', t('productDetail.shippingToday')],
                ['🔄', t('productDetail.return24h')],
                ['🛡️', t('productDetail.freshGuarantee')],
              ].map(([icon, text]) => (
                <div key={text} className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xl mb-0.5">{icon}</div>
                  <div className="text-xs text-gray-500">{text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{t('productDetail.description')}</h2>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
            {product.tags && (
              <div className="flex flex-wrap gap-2 mt-4">
                {product.tags.map((tag) => (
                  <span key={tag} className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full font-medium">#{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{t('productDetail.additionalInfo')}</h2>
            <ul className="space-y-3 text-sm">
              {[
                [t('productDetail.infoOrigin'), product.origin],
                [t('productDetail.infoUnit'), product.unit],
                [t('productDetail.infoStock'), t('productDetail.infoStockValue', { count: product.stock })],
                [t('productDetail.infoRating'), t('productDetail.infoRatingValue', { rating: product.rating, count: product.reviewCount })],
              ].map(([k, v]) => (
                <li key={k} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-gray-700">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-800 mb-6">{t('productDetail.related')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => product && addToCart(product, qty)}
        />
      )}
    </>
  );
}
