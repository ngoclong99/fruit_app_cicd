import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../hooks/useAuth';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const fill = (e: string, p: string) => { setEmail(e); setPassword(p); };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim()) { setError(t('auth.nameRequired')); return; }
      if (password.length < 6) { setError(t('auth.passwordMin')); return; }
      if (password !== confirmPassword) { setError(t('auth.passwordMismatch')); return; }
      setLoading(true);
      try {
        const ok = await register({ name, email, password });
        setLoading(false);
        if (!ok) { setError(t('auth.registerFailed')); return; }
      } catch (err) {
        setLoading(false);
        setError((err as Error).message || t('auth.registerFailed'));
        return;
      }
    } else {
      setLoading(true);
      try {
        const ok = await login(email, password);
        setLoading(false);
        if (!ok) { setError(t('auth.wrongCredentials')); return; }
      } catch (err) {
        setLoading(false);
        setError((err as Error).message || t('auth.wrongCredentials'));
        return;
      }
    }

    onSuccess?.();
    onClose();
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

        <div className="flex border-b border-gray-100">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === 'login' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {t('auth.login', 'Đăng nhập')}
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === 'register' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {t('auth.register')}
          </button>
        </div>

        <div className="px-6 py-5">
          {mode === 'login' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-xs font-semibold text-amber-700 mb-2">{t('auth.testAccounts')}</p>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => fill('admin@fruitshop.vn', 'admin123')}
                  className="w-full flex items-center gap-2 bg-white hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 text-xs transition-colors text-left"
                >
                  <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">A</span>
                  <span className="text-gray-700">{t('auth.admin')}</span>
                  <span className="text-gray-400 font-mono ml-auto">admin@fruitshop.vn</span>
                </button>
                <button
                  type="button"
                  onClick={() => fill('user@fruitshop.vn', 'user123')}
                  className="w-full flex items-center gap-2 bg-white hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 text-xs transition-colors text-left"
                >
                  <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">U</span>
                  <span className="text-gray-700">{t('auth.user')}</span>
                  <span className="text-gray-400 font-mono ml-auto">user@fruitshop.vn</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-semibold text-gray-600 mb-1">{t('auth.name')}</label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  placeholder={t('auth.namePlaceholder')}
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-gray-600 mb-1">{t('auth.email')}</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="auth-pass" className="block text-xs font-semibold text-gray-600 mb-1">{t('auth.password')}</label>
              <div className="relative">
                <input
                  id="auth-pass"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="auth-confirm" className="block text-xs font-semibold text-gray-600 mb-1">{t('auth.confirmPassword')}</label>
                <input
                  id="auth-confirm"
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-xl">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm mt-1"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    {mode === 'login' ? t('auth.loggingIn') : t('auth.registering')}
                  </span>
                : mode === 'login' ? t('auth.login') : t('auth.register')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
