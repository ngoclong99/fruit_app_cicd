// Backward-compatible shim — re-exports new error classes/handlers with
// the original `HttpError` API used by existing routes.
//
// New code should import from `shared/errors/AppError` and
// `shared/middleware/errorHandler` directly.
import { AppError } from '@/shared/errors/AppError';
import { codeForStatus } from '@/shared/errors/errorCodes';

export { asyncHandler, errorHandler } from '@/shared/middleware/errorHandler';

/**
 * Legacy HttpError class — now extends AppError so the global error handler
 * (which knows about AppError) can serialize it uniformly. Mã lỗi lấy từ
 * catalog chung (errorCodes.ts) → 1 code/status, đồng bộ với AppError & FE.
 */
export class HttpError extends AppError {
  constructor(status: number, message: string) {
    super(message, status, codeForStatus(status) ?? `HTTP_${status}`);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const unauthorized = (msg = 'Unauthorized') => new HttpError(401, msg);
export const forbidden = (msg = 'Forbidden') => new HttpError(403, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);
