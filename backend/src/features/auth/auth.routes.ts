import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "./auth.controller";
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  refreshSchema,
  mfaCodeSchema,
  mfaVerifyLoginSchema,
} from "./auth.schema";
import { validateBody } from "@/shared/middleware/validateBody";
import { asyncHandler } from "@/shared/middleware/errorHandler";
import { authenticate } from "@/middleware/auth";

const router = Router();

// Rate limit chặt cho các endpoint nhạy cảm (anti brute-force).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMITED", message: "Too many auth attempts, please try again later" },
});

// ─── Login / Register ───────────────────────────────────────────────────────
router.post("/login", authLimiter, validateBody(loginSchema), asyncHandler(authController.login));
router.post("/register", authLimiter, validateBody(registerSchema), asyncHandler(authController.register));
// Bước 2 của login khi user bật MFA (nhập mã 6 số).
router.post("/mfa/verify", authLimiter, validateBody(mfaVerifyLoginSchema), asyncHandler(authController.verifyMfaLogin));

// ─── Token revocation ─────────────────────────────────────────────────────
// /refresh chạy thường xuyên (mỗi ~15') nên KHÔNG dùng authLimiter (10/15') —
// chỉ chịu global rate limit. /logout thu hồi refresh token.
router.post("/refresh", validateBody(refreshSchema), asyncHandler(authController.refresh));
router.post("/logout", validateBody(refreshSchema), asyncHandler(authController.logout));

// ─── Account ─────────────────────────────────────────────────────────────
router.get("/me", authenticate, asyncHandler(authController.me));
router.patch("/change-password", authenticate, validateBody(changePasswordSchema), asyncHandler(authController.changePassword));

// ─── Email verification ───────────────────────────────────────────────────
router.get("/verify-email", asyncHandler(authController.verifyEmail));
// authLimiter: chống spam gửi email xác minh.
router.post("/resend-verification", authLimiter, authenticate, asyncHandler(authController.resendVerification));

// ─── MFA (TOTP) ─────────────────────────────────────────────────────────
router.post("/mfa/setup", authenticate, asyncHandler(authController.mfaSetup));
// authLimiter: chống brute-force mã 6 số khi bật/tắt MFA.
router.post("/mfa/enable", authLimiter, authenticate, validateBody(mfaCodeSchema), asyncHandler(authController.mfaEnable));
router.post("/mfa/disable", authLimiter, authenticate, validateBody(mfaCodeSchema), asyncHandler(authController.mfaDisable));

export default router;
