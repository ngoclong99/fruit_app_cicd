import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "@/shared/errors/AppError";
import { ERROR_CODES } from "@/shared/errors/errorCodes";
import { logger } from "@/config/logger";
import { isProduction } from "@/config/env";

/**
 * Wrap async route handlers so rejections are forwarded to errorHandler.
 * Express 5 forwards async errors automatically, but this keeps behaviour
 * consistent with sync throws inside Promise chains.
 */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // zod validation error
  if (err instanceof ZodError) {
    res.status(ERROR_CODES.VALIDATION_ERROR.status).json({
      error: "VALIDATION_ERROR",
      message: "Invalid input",
      details: err.flatten(),
    });
    return;
  }

  // Application errors (subclasses of AppError)
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  // Unknown error — log full info but return generic message
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  const message = err instanceof Error && !isProduction ? err.message : "Internal Server Error";
  res.status(ERROR_CODES.INTERNAL_ERROR.status).json({
    error: "INTERNAL_ERROR",
    message,
  });
}
