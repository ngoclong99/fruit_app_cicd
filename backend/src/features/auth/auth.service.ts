import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { authRepository, mapUser, type UserRow } from "./auth.repository";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../shared/errors/AppError";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type { User, JwtPayload } from "../../types";
import type { LoginInput, RegisterInput, ChangePasswordInput } from "./auth.schema";

const BCRYPT_COST = 10;

function signToken(user: User): string {
  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export const authService = {
  async login(input: LoginInput): Promise<{ token: string; user: User }> {
    const row = await authRepository.findByEmail(input.email);
    if (!row || !(await bcrypt.compare(input.password, row.password_hash))) {
      throw new UnauthorizedError("Invalid credentials");
    }
    if (row.status === "blocked") {
      throw new ForbiddenError("Account is blocked");
    }

    const user = mapUser(row);
    const token = signToken(user);
    logger.info({ userId: user.id, email: user.email }, "User logged in");
    return { token, user };
  },

  async register(input: RegisterInput): Promise<{ token: string; user: User }> {
    if (await authRepository.existsByEmail(input.email)) {
      throw new ConflictError("Email already exists");
    }

    const id = `${Date.now()}`;
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(input.email)}`;

    const row = await authRepository.create({
      id,
      name: input.name,
      email: input.email,
      passwordHash,
      role: "user",
      avatar,
      phone: input.phone ?? null,
    });

    const user = mapUser(row);
    const token = signToken(user);
    logger.info({ userId: user.id, email: user.email }, "User registered");
    return { token, user };
  },

  async getById(id: string): Promise<User> {
    const row = await authRepository.findById(id);
    if (!row) throw new NotFoundError("User not found");
    return mapUser(row);
  },

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const row = await authRepository.findById(userId);
    if (!row) throw new NotFoundError("User not found");

    const matches = await bcrypt.compare(input.currentPassword, row.password_hash);
    if (!matches) throw new UnauthorizedError("Current password is incorrect");

    const newHash = await bcrypt.hash(input.newPassword, BCRYPT_COST);
    await authRepository.updatePassword(userId, newHash);
    logger.info({ userId }, "Password changed");
  },
};

// Re-export UserRow type for convenience
export type { UserRow };
