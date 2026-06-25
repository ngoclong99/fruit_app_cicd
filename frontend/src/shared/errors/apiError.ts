// ============================================================================
// apiError.ts — Module CHUNG xử lý lỗi API (BE↔FE).
// ----------------------------------------------------------------------------
// Đây là "1 function/class common" để KHÔNG phải lặp code check lỗi ở từng nơi:
//   - ApiError            : kiểu lỗi chuẩn { message, code, status, details }.
//   - getApiErrorMessage  : map code/message từ server → message hiển thị (i18n).
//   - error-bus           : cầu nối để axios interceptor (ngoài React) bật alert
//                            qua DialogContext (xem ApiErrorBridge.tsx).
//
// Cách dùng: KHÔNG check status thủ công. Axios interceptor (api/axios.ts) tự
// kiểm tra: 2xx → trả data; non-2xx → tạo ApiError + bật alert toàn cục.
// ============================================================================

import i18n from '@/i18n';
import { isErrorCode } from './errorCodes';

export class ApiError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly details?: unknown;

  constructor(
    message: string,
    opts: { code?: string; status?: number; details?: unknown } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
  }
}

/**
 * Lấy message hiển thị cho người dùng từ response lỗi.
 * Ưu tiên:
 *   1. `serverMessage` cụ thể từ BE (vd "price is required").
 *   2. map theo `code` → i18n `errors.<CODE>` (đã dịch vi/en).
 *   3. fallback chung `errors.UNKNOWN`.
 */
export function getApiErrorMessage(code?: string, serverMessage?: string): string {
  if (serverMessage && serverMessage.trim()) return serverMessage;
  if (isErrorCode(code)) return i18n.t(`errors.${code}`);
  return i18n.t('errors.UNKNOWN');
}

// ─── Global error-alert bus ─────────────────────────────────────────────────
// Interceptor chạy NGOÀI React nên không gọi được hook. Bus cho phép
// ApiErrorBridge (trong React) đăng ký hàm alert, interceptor chỉ cần emit.
type AlertHandler = (message: string, title?: string) => void;

let alertHandler: AlertHandler | null = null;

export const registerErrorAlert = (fn: AlertHandler | null): void => {
  alertHandler = fn;
};

export const showErrorAlert = (message: string, title?: string): void => {
  alertHandler?.(message, title);
};
