import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ProductCard from '@/components/user/ui/Card/ProductCard';
import { useDebounce } from '@/hooks/useDebounce';
import { productsApi } from '@/api/endpoints/products';
import type { Product } from '@/types';

export default function Search() {
  const { t } = useTranslation();
  const [queryRaw, setQueryRaw] = useState('');
  const query = useDebounce(queryRaw, 300);
  const [results, setResults] = useState<Product[]>([]);

  const fetchKey = query.length >= 2 ? query : '';
  const [completedKey, setCompletedKey] = useState(fetchKey);
  const loading = fetchKey !== completedKey && fetchKey !== '';

  useEffect(() => {
    if (query.length < 2) { setResults([]); setCompletedKey(''); return; }
    const key = query;
    productsApi.list({ search: query, limit: 100 })
      .then((r) => { setResults(r.data); setCompletedKey(key); })
      .catch(() => { setResults([]); setCompletedKey(key); });
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('search.title')}</h1>
      <div className="relative mb-8">
        <input
          autoFocus
          type="text"
          value={queryRaw}
          onChange={(e) => setQueryRaw(e.target.value)}
          placeholder={t('search.placeholder')}
          className="w-full border-2 border-gray-200 focus:border-green-500 rounded-2xl px-5 py-4 text-lg pr-12 focus:outline-none transition"
        />
        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
      </div>

      {query.length >= 2 && !loading && (
        <p className="text-gray-500 text-sm mb-4">
          {t('search.results', { count: results.length, query })}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {results.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : query.length >= 2 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-6xl mb-4">😢</div>
          <p className="text-lg">{t('search.notFound')}</p>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <div className="text-6xl mb-4">🍎</div>
          <p>{t('search.hint')}</p>
        </div>
      )}
    </div>
  );
}
