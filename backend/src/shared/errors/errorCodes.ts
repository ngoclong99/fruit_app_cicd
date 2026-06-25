// ============================================================================
// ERROR CODE CATALOG — hợp đồng lỗi chung giữa Backend ↔ Frontend (BE↔FE)
// ----------------------------------------------------------------------------
// Mọi response lỗi của API đều có dạng: { error: <ErrorCode>, message, details? }
//   - `error`   : mã semantic ổn định, FE/mobile map ra message hiển thị.
//   - `message` : mô tả cụ thể (vd "price is required") — ưu tiên hiển thị nếu có.
//   - `details` : chỉ kèm với lỗi validation (zod .flatten()).
//
// ⚠️ ĐÂY LÀ NGUỒN SỰ THẬT (single source of truth). Vì BE/FE/mobile là 3 package
//    tách biệt nên có 2 file MIRROR phải giữ ĐỒNG BỘ với file này:
//      - frontend/src/shared/errors/errorCodes.ts
//      - mobile/src/shared/errors/errorCodes.ts
//    Tài liệu: docs/API.md (mục Error response).
// ============================================================================

export const ERROR_CODES = {
  BAD_REQUEST:      { status: 400, message: "Yêu cầu không hợp lệ" },
  UNAUTHORIZED:     { status: 401, message: "Bạn cần đăng nhập để tiếp tục" },
  FORBIDDEN:        { status: 403, message: "Bạn không có quyền thực hiện thao tác này" },
  NOT_FOUND:        { status: 404, message: "Không tìm thấy dữ liệu yêu cầu" },
  CONFLICT:         { status: 409, message: "Dữ liệu đã tồn tại hoặc bị xung đột" },
  VALIDATION_ERROR: { status: 422, message: "Dữ liệu nhập vào không hợp lệ" },
  RATE_LIMITED:     { status: 429, message: "Bạn thao tác quá nhanh, vui lòng thử lại sau" },
  INTERNAL_ERROR:   { status: 500, message: "Lỗi máy chủ, vui lòng thử lại sau" },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/** HTTP status mặc định cho một mã lỗi. */
export const statusForCode = (code: ErrorCode): number => ERROR_CODES[code].status;

/** Message mặc định (tiếng Việt) cho một mã lỗi — dùng làm fallback. */
export const messageForCode = (code: ErrorCode): string => ERROR_CODES[code].message;

/** Map ngược status → mã lỗi (lấy mã đầu tiên khớp). Dùng cho HttpError legacy. */
export const codeForStatus = (status: number): ErrorCode | undefined =>
  (Object.keys(ERROR_CODES) as ErrorCode[]).find((c) => ERROR_CODES[c].status === status);
