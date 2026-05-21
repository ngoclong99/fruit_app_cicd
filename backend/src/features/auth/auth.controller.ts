import type { Request, Response } from "express";
import { authService } from "./auth.service";
import type { AuthRequest } from "../../middleware/auth";
import type { LoginInput, RegisterInput, ChangePasswordInput } from "./auth.schema";

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body as LoginInput);
    res.json(result);
  },

  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body as RegisterInput);
    res.status(201).json(result);
  },

  async me(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const user = await authService.getById(req.user.userId);
    res.json(user);
  },

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    await authService.changePassword(req.user.userId, req.body as ChangePasswordInput);
    res.json({ message: "Password changed successfully" });
  },
};
