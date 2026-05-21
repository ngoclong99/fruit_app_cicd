import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import productsRouter from "./routes/products";
import categoriesRouter from "./routes/categories";
import ordersRouter from "./routes/orders";
import usersRouter from "./routes/users";
import statsRouter from "./routes/stats";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0"; // ← BẮT BUỘC 0.0.0.0, KHÔNG PHẢI localhost!

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/users", usersRouter);
app.use("/api/stats", statsRouter);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Invalid JSON body → 400 with consistent shape
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }
  next(err);
});

// 404 for unknown /api/* routes
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// Global error handler — must be last
app.use(errorHandler);

app.listen(PORT, HOST, () =>
  console.log(`Server running http://${HOST}:${PORT}`),
);

// Graceful shutdown khi Docker stop
process.on("SIGTERM", () => process.exit(0));
export default app;
