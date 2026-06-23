import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/api/endpoints/users';
import { authApi } from '@/api/endpoints/auth';
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm';
import { MfaSettings } from '@/features/auth/components/MfaSettings';

export default function Profile() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleResendVerification = async () => {
    setResendState('sending');
    try {
      await authApi.resendVerification();
      setResendState('sent');
    } catch {
      setResendState('idle');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const updated = await usersApi.update(user.id, { name, phone });
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Lỗi API đã được alert toàn cục bởi axios interceptor
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('profile.title')}</h1>

      {user && !user.emailVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3 flex-wrap">
          <span className="text-xl">✉️</span>
          <p className="text-sm text-amber-800 flex-1">{t('emailVerify.banner')}</p>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendState !== 'idle'}
            className="text-sm font-semibold text-amber-700 hover:text-amber-900 disabled:opacity-60"
          >
            {resendState === 'sending' ? t('emailVerify.sending') : resendState === 'sent' ? t('emailVerify.sent') : t('emailVerify.resend')}
          </button>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-700">
            {user?.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg">{user?.name}</p>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
              user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
            }`}>
              {user?.role === 'admin' ? t('profile.roleAdmin') : t('profile.roleUser')}
            </span>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fullName')}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('profile.fullName')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.email')}</label>
              <input
                defaultValue={user?.email}
                type="email"
                placeholder={t('profile.email')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                readOnly
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.phone')}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('profile.phonePlaceholder')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className={`w-full py-3 rounded-xl font-semibold transition disabled:opacity-60 ${
              saved ? 'bg-green-500 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {saved ? t('profile.saved') : t('profile.save')}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
        <h2 className="font-bold text-gray-800 mb-4">{t('auth.changePassword')}</h2>
        <ChangePasswordForm />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
        <h2 className="font-bold text-gray-800 mb-4">{t('auth.mfaSection')}</h2>
        <MfaSettings />
      </div>
    </div>
  );
}
