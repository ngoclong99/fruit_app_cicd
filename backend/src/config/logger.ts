import pino from "pino";
import { env, isProduction } from "./env";

// Dùng pino-pretty (log màu, dễ đọc) ở dev — NHƯNG chỉ khi nó thực sự được cài.
// Image production cài `--omit=dev` nên KHÔNG có pino-pretty; nếu container chạy
// với NODE_ENV=development mà vẫn ép dùng pino-pretty → pino crash lúc khởi động.
// Guard bằng require.resolve để tự degrade về log JSON khi thiếu module.
function prettyTransport(): pino.TransportSingleOptions | undefined {
  if (isProduction) return undefined;
  try {
    require.resolve("pino-pretty");
    return {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
    };
  } catch {
    return undefined; // pino-pretty chưa cài → log JSON thường (vd trong Docker prod image)
  }
}

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: prettyTransport(),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.currentPassword",
      "req.body.newPassword",
      "req.body.refreshToken",
      "req.body.mfaToken",
      "req.body.code",
      "*.password",
      "*.passwordHash",
      "*.password_hash",
      "*.token",
      "*.refreshToken",
      "*.mfaToken",
      "*.mfa_secret",
      "*.secret",
      "*.otpauthUrl",
      "*.email_verify_token",
    ],
    censor: "[REDACTED]",
  },
});
