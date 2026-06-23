import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDialog } from '@/context/DialogContext';
import { registerErrorAlert } from './apiError';

/**
 * Cầu nối error-bus ↔ DialogContext.
 * Đăng ký hàm `alert` của DialogContext vào bus để axios interceptor (chạy ngoài
 * React) có thể bật alert lỗi toàn cục. Mount 1 lần trong DialogProvider.
 */
export default function ApiErrorBridge() {
  const { alert } = useDialog();
  const { t } = useTranslation();

  useEffect(() => {
    registerErrorAlert((message, title) => {
      void alert({ title: title ?? t('errors.title'), body: message, type: 'danger' });
    });
    return () => registerErrorAlert(null);
  }, [alert, t]);

  return null;
}
