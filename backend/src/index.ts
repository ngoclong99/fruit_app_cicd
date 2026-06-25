import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler } from "./shared/middleware/errorHandler";
import { responseEnvelope } from "./shared/middleware/responseEnvelope";

// Refactored routes (feature-based — Controller/Service/Repository pattern)
import authRouter from "./features/auth/auth.routes";

// Legacy routes — kept as-is for backward compat. Refactor to feature-based gradually.
import productsRouter from "./routes/products";
import categoriesRouter from "./routes/categories";
import ordersRouter from "./routes/orders";
import usersRouter from "./routes/users";
import statsRouter from "./routes/stats";
import uploadRouter from "./routes/upload";
import videosRouter from "./routes/videos";

const app = express();

// ─── Security headers ────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

// ─── Request logging (structured JSON in prod, pretty in dev) ────────
app.use(
  pinoHttp({
    logger,
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
);

// ─── Body parser ─────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));

// ─── Unified response envelope ({ code, message, data } | { code, error, message }) ──
app.use(responseEnvelope);

// ─── Global rate limit (anti DDoS / abuse) ───────────────────────────
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "RATE_LIMITED", message: "Too many requests, please slow down" },
  }),
);

// ─── Health check (must be before routes to avoid auth/rate-limit edge cases on healthz) ──
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ─── Routes ──────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/users", usersRouter);
app.use("/api/stats", statsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/videos", videosRouter);

// ─── Invalid JSON body → 400 ─────────────────────────────────────────
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "BAD_REQUEST", message: "Invalid JSON body" });
    return;
  }
  next(err);
});

// ─── 404 for unknown /api/* routes ───────────────────────────────────
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Endpoint not found" });
});

// ─── Global error handler — must be LAST ─────────────────────────────
app.use(errorHandler);

// ─── Boot ────────────────────────────────────────────────────────────
const server = app.listen(env.PORT, env.HOST, () =>
  logger.info({ host: env.HOST, port: env.PORT, env: env.NODE_ENV }, "Server started"),
);

// Graceful shutdown khi Docker stop
const shutdown = (signal: string) => {
  logger.info({ signal }, "Shutting down");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
