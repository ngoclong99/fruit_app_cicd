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
  JWT_EXPIRES_IN: z.string().default("7d"),

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

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
  // In dev: warn but continue with fallback values where possible
  console.warn("Continuing with defaults — fix .env for production!");
}

const fallback = envSchema.safeParse({ ...process.env, JWT_SECRET: process.env.JWT_SECRET ?? "fruit-shop-secret-key-dev-only-please-change" });
export const env = parsed.success ? parsed.data : (fallback.success ? fallback.data : envSchema.parse({ JWT_SECRET: "fruit-shop-secret-key-dev-only-please-change" }));

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
