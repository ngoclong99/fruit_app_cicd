// ============================================================================
// ERROR CODE CATALOG (mobile) — MIRROR của backend/src/shared/errors/errorCodes.ts
// ⚠️ GIỮ ĐỒNG BỘ với backend. Mobile không có i18n nên giữ message tiếng Việt.
// ============================================================================

export const ERROR_MESSAGES: Record<string, string> = {
  BAD_REQUEST: 'Yêu cầu không hợp lệ',
  UNAUTHORIZED: 'Bạn cần đăng nhập để tiếp tục',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu',
  CONFLICT: 'Dữ liệu đã tồn tại hoặc bị xung đột',
  VALIDATION_ERROR: 'Dữ liệu nhập vào không hợp lệ',
  RATE_LIMITED: 'Bạn thao tác quá nhanh, vui lòng thử lại sau',
  INTERNAL_ERROR: 'Lỗi máy chủ, vui lòng thử lại sau',
};

/** Lỗi API chuẩn — mang theo code + status để màn hình xử lý nếu cần. */
export class ApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, opts: { code?: string; status?: number } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = opts.code;
    this.status = opts.status;
  }
}

/** Map code/message từ server → message hiển thị. Ưu tiên message cụ thể từ server. */
export function getApiErrorMessage(code?: string, serverMessage?: string): string {
  if (serverMessage && serverMessage.trim()) return serverMessage;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return 'Đã xảy ra lỗi khi kết nối máy chủ';
}
