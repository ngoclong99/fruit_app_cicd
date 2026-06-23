import { ERROR_CODES } from "./errorCodes";

/**
 * Base class for all application errors.
 * Use this (or subclasses) to throw errors that can be safely serialized
 * to HTTP responses by the errorHandler middleware.
 *
 * Status/code của các subclass lấy từ catalog chung (errorCodes.ts) để BE/FE
 * dùng đúng MỘT bộ mã lỗi.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ERROR_CODES.BAD_REQUEST.status, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, ERROR_CODES.UNAUTHORIZED.status, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, ERROR_CODES.FORBIDDEN.status, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, ERROR_CODES.NOT_FOUND.status, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ERROR_CODES.CONFLICT.status, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(message, ERROR_CODES.VALIDATION_ERROR.status, "VALIDATION_ERROR", details);
  }
}
