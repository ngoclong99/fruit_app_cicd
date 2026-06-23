import type { Request, Response } from "express";
import { authService } from "./auth.service";
import { BadRequestError, UnauthorizedError } from "@/shared/errors/AppError";
import type { AuthRequest } from "@/middleware/auth";
import type {
  LoginInput,
  RegisterInput,
  ChangePasswordInput,
  RefreshInput,
  MfaCodeInput,
  MfaVerifyLoginInput,
} from "./auth.schema";

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    // Kết quả là { token, refreshToken, user } HOẶC { mfaRequired, mfaToken } nếu bật MFA.
    const result = await authService.login(req.body as LoginInput);
    res.json(result);
  },

  async verifyMfaLogin(req: Request, res: Response): Promise<void> {
    const result = await authService.verifyMfaLogin(req.body as MfaVerifyLoginInput);
    res.json(result);
  },

  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body as RegisterInput);
    res.status(201).json(result);
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const result = await authService.refresh((req.body as RefreshInput).refreshToken);
    res.json(result);
  },

  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout((req.body as RefreshInput).refreshToken);
    res.json({ message: "Logged out" });
  },

  async me(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    res.json(await authService.getById(req.user.userId));
  },

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    await authService.changePassword(req.user.userId, req.body as ChangePasswordInput);
    res.json({ message: "Password changed successfully" });
  },

  // ─── Email verification ───────────────────────────────────────────────────
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const token = req.query.token;
    if (typeof token !== "string" || !token) throw new BadRequestError("Missing token");
    await authService.verifyEmail(token);
    res.json({ message: "Email verified successfully" });
  },

  async resendVerification(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    await authService.resendVerification(req.user.userId);
    res.json({ message: "Verification email sent" });
  },

  // ─── MFA ────────────────────────────────────────────────────────────────
  async mfaSetup(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    res.json(await authService.mfaSetup(req.user.userId));
  },

  async mfaEnable(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    await authService.mfaEnable(req.user.userId, (req.body as MfaCodeInput).code);
    res.json({ message: "MFA enabled" });
  },

  async mfaDisable(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError();
    await authService.mfaDisable(req.user.userId, (req.body as MfaCodeInput).code);
    res.json({ message: "MFA disabled" });
  },
};
