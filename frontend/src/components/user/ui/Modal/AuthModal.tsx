import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import type { LoginInput } from '@/shared/schemas/auth.schema';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const { login, verifyMfa, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [prefill, setPrefill] = useState<LoginInput>({ email: '', password: '' });
  // Khi login trả mfaRequired → giữ mfaToken + hiện bước nhập mã 6 số.
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  const finish = () => {
    onSuccess?.();
    onClose();
  };

  const handleLogin = async (data: LoginInput) => {
    const r = await login(data.email, data.password); // throw → LoginForm hiển thị lỗi
    if (r.mfaRequired) setMfaToken(r.mfaToken);
    else finish();
  };

  const handleRegister = async (data: { name: string; email: string; password: string; phone?: string }) => {
    await register(data);
    finish();
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');
    setMfaLoading(true);
    try {
      await verifyMfa(mfaToken!, mfaCode);
      finish();
    } catch (err) {
      setMfaError((err as Error).message);
    } finally {
      setMfaLoading(false);
    }
  };

  const fillTestAccount = (email: string, password: string) => {
    setMode('login');
    setPrefill({ email, password });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-linear-to-br from-green-700 to-green-600 px-6 pt-8 pb-6 text-center relative">
          <button
            type="button"
            title={t('auth.close')}
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="text-4xl mb-2">🍃</div>
          <h2 className="text-xl font-bold text-white">{t('auth.welcome')}</h2>
          <p className="text-green-200 text-sm mt-1">{t('auth.subtitle')}</p>
        </div>

        {/* Bước nhập mã MFA (sau khi mật khẩu đúng) */}
        {mfaToken ? (
          <form onSubmit={handleMfaSubmit} className="px-6 py-6 space-y-4">
            <div className="text-center">
              <div className="text-3xl mb-2">🔐</div>
              <h3 className="font-bold text-gray-800">{t('auth.mfaTitle')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('auth.mfaPrompt')}</p>
            </div>
            <input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full text-center tracking-[0.5em] text-lg border border-gray-200 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {mfaError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-xl">{mfaError}</div>
            )}
            <button
              type="submit"
              disabled={mfaLoading || mfaCode.length !== 6}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {mfaLoading ? t('auth.verifying') : t('auth.verify')}
            </button>
          </form>
        ) : (
          <>
            <div className="flex border-b border-gray-100">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === 'login' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t('auth.login')}
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === 'register' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t('auth.register')}
              </button>
            </div>

            <div className="px-6 py-5">
              {mode === 'login' ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                    <p className="text-xs font-semibold text-amber-700 mb-2">{t('auth.testAccounts')}</p>
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => fillTestAccount('admin@fruitshop.vn', 'admin123')}
                        className="w-full flex items-center gap-2 bg-white hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 text-xs transition-colors text-left"
                      >
                        <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">A</span>
                        <span className="text-gray-700">{t('auth.admin')}</span>
                        <span className="text-gray-400 font-mono ml-auto">admin@fruitshop.vn</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fillTestAccount('user@fruitshop.vn', 'user123')}
                        className="w-full flex items-center gap-2 bg-white hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 text-xs transition-colors text-left"
                      >
                        <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">U</span>
                        <span className="text-gray-700">{t('auth.user')}</span>
                        <span className="text-gray-400 font-mono ml-auto">user@fruitshop.vn</span>
                      </button>
                    </div>
                  </div>
                  <LoginForm key={`${prefill.email}:${prefill.password}`} defaultValues={prefill} onSubmit={handleLogin} />
                </>
              ) : (
                <RegisterForm onSubmit={handleRegister} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
