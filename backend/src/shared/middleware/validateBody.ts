import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny, z } from "zod";

/**
 * Middleware factory that validates `req.body` against a zod schema.
 * On success, replaces `req.body` with the parsed (typed) value.
 * On failure, calls next(error) — errorHandler converts to 422 response.
 *
 * Usage:
 *   router.post("/login", validateBody(loginSchema), controller.login);
 *
 * In the controller, `req.body` is typed as z.infer<typeof loginSchema>.
 */
export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data as z.infer<S>;
    next();
  };
}

/**
 * Validate `req.query`. Coerces strings via the schema (use z.coerce.number, etc.).
 */
export function validateQuery<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Note: req.query is readonly in Express 5; we attach parsed version separately
    (req as Request & { validatedQuery?: z.infer<S> }).validatedQuery = result.data as z.infer<S>;
    next();
  };
}

/**
 * Validate `req.params`.
 */
export function validateParams<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(result.error);
      return;
    }
    (req as Request & { validatedParams?: z.infer<S> }).validatedParams = result.data as z.infer<S>;
    next();
  };
}
