import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  HOST: z.string().default("0.0.0.0"),

  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().default("myuser"),
  DB_PASSWORD: z.string().default("mypassword"),
  DB_NAME: z.string().default("mydb"),

  JWT_SECRET: z.string().min(8, "JWT_SECRET should be at least 8 chars"),
  // Access token NGẮN hạn — refresh token (lưu DB, revoke được) lo việc gia hạn.
  // Càng ngắn → block user/đổi quyền có hiệu lực càng nhanh.
  JWT_EXPIRES_IN: z.string().default("15m"),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

  // S3 image storage — optional in dev so the app still boots without AWS creds.
  // In production these must be set via SSM; the upload route refuses to run
  // if S3_IMAGES_BUCKET is empty.
  S3_IMAGES_BUCKET: z.string().default(""),
  S3_IMAGES_REGION: z.string().default("ap-southeast-1"),
  CDN_IMAGES_URL: z.string().default(""),
});

// Secret dev mặc định — CHỈ cho local. Production tuyệt đối không được dùng (check ở cuối file).
const DEV_JWT_SECRET = "fruit-shop-secret-key-dev-only-please-change";

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
  // In dev: warn but continue with fallback values where possible
  console.warn("Continuing with defaults — fix .env for production!");
}

const fallback = envSchema.safeParse({ ...process.env, JWT_SECRET: process.env.JWT_SECRET ?? DEV_JWT_SECRET });
export const env = parsed.success ? parsed.data : (fallback.success ? fallback.data : envSchema.parse({ JWT_SECRET: DEV_JWT_SECRET }));

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";

// ── Hardening JWT secret cho production ──────────────────────────────
// Chặn lỗi nghiêm trọng: deploy production mà vẫn dùng secret dev mặc định
// (ai cũng biết → giả mạo token được). Khuyến nghị secret ngẫu nhiên ≥ 32 ký tự.
if (isProduction) {
  if (env.JWT_SECRET === DEV_JWT_SECRET) {
    console.error("FATAL: JWT_SECRET đang là giá trị dev mặc định — đặt secret riêng cho production (SSM)!");
    process.exit(1);
  }
  if (env.JWT_SECRET.length < 32) {
    console.warn("CẢNH BÁO BẢO MẬT: JWT_SECRET nên dài ≥ 32 ký tự ngẫu nhiên cho production.");
  }
}
