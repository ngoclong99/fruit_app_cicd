import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/endpoints/auth';

/**
 * Trang đích của link xác minh email (/verify-email?token=...).
 * Gọi BE verify-email rồi hiển thị kết quả thành công/thất bại.
 */
export default function VerifyEmail() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const ran = useRef(false); // tránh gọi 2 lần do StrictMode

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }
    authApi.verifyEmail(token).then(() => setStatus('ok')).catch(() => setStatus('error'));
  }, [params]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      {status === 'loading' && (
        <>
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t('emailVerify.verifying')}</p>
        </>
      )}
      {status === 'ok' && (
        <>
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('emailVerify.successTitle')}</h2>
          <p className="text-gray-500 mb-6">{t('emailVerify.successDesc')}</p>
          <Link to="/" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition">
            {t('emailVerify.home')}
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('emailVerify.errorTitle')}</h2>
          <p className="text-gray-500 mb-6">{t('emailVerify.errorDesc')}</p>
          <Link to="/" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition">
            {t('emailVerify.home')}
          </Link>
        </>
      )}
    </div>
  );
}
