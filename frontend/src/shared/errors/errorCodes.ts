// ============================================================================
// ERROR CODE CATALOG (FE) — MIRROR của backend/src/shared/errors/errorCodes.ts
// ⚠️ GIỮ ĐỒNG BỘ với backend. Mọi response lỗi API: { error: <code>, message }.
// ============================================================================

export const ERROR_CODES = [
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Kiểm tra một chuỗi có phải mã lỗi hợp lệ không. */
export const isErrorCode = (v: unknown): v is ErrorCode =>
  typeof v === 'string' && (ERROR_CODES as readonly string[]).includes(v);

/** true nếu HTTP status thuộc dải thành công (2xx). */
export const isSuccessStatus = (status?: number): boolean =>
  status !== undefined && status >= 200 && status < 300;
