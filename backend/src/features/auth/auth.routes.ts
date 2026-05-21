import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "./auth.controller";
import { loginSchema, registerSchema, changePasswordSchema } from "./auth.schema";
import { validateBody } from "../../shared/middleware/validateBody";
import { asyncHandler } from "../../shared/middleware/errorHandler";
import { authenticate } from "../../middleware/auth";

const router = Router();

// Stricter rate limit for auth endpoints (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMITED", message: "Too many auth attempts, please try again later" },
});

router.post("/login", authLimiter, validateBody(loginSchema), asyncHandler(authController.login));
router.post("/register", authLimiter, validateBody(registerSchema), asyncHandler(authController.register));
router.get("/me", authenticate, asyncHandler(authController.me));
router.patch("/change-password", authenticate, validateBody(changePasswordSchema), asyncHandler(authController.changePassword));

export default router;
