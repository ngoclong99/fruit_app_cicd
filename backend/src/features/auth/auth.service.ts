import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { randomBytes, createHash, randomUUID } from "crypto";
import { authenticator } from "otplib";
import { authRepository, mapUser, type UserRow } from "./auth.repository";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/shared/errors/AppError";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { isUniqueViolation } from "@/shared/db/pgErrors";
import type { User, JwtPayload } from "@/types";
import type {
  LoginInput,
  RegisterInput,
  ChangePasswordInput,
  MfaVerifyLoginInput,
} from "./auth.schema";

const BCRYPT_COST = 10;
const REFRESH_TTL_DAYS = 7;
const MFA_ISSUER = "FruitShop";

// Hash giả tính sẵn — login constant-time (chống dò email qua timing).
const DUMMY_HASH = bcrypt.hashSync("invalid-account-placeholder", BCRYPT_COST);

const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

// Cho phép lệch ±1 bước thời gian (±30s) khi verify TOTP — chịu được đồng hồ
// điện thoại lệch nhẹ so với server (thực tế thường gặp).
authenticator.options = { window: 1 };

// ─── Token helpers ──────────────────────────────────────────────────────────
function signToken(user: User): string {
  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

// Token TẠM giữa 2 bước login khi user bật MFA (sống ngắn, chỉ để xác thực MFA).
function signMfaToken(userId: string): string {
  return jwt.sign({ userId, purpose: "mfa" }, env.JWT_SECRET, { expiresIn: "5m" });
}

// Refresh token = chuỗi ngẫu nhiên; chỉ LƯU HASH trong DB (revoke được).
async function issueRefreshToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000);
  await authRepository.createRefreshToken({ tokenHash: sha256(raw), userId, expiresAt });
  // Dọn token cũ (best-effort, không chặn login).
  authRepository.deleteExpiredRefreshTokens().catch(() => {});
  return raw;
}

async function issueSession(user: User): Promise<SessionResult> {
  return { token: signToken(user), refreshToken: await issueRefreshToken(user.id), user };
}

// Demo: chưa tích hợp AWS SES/SMTP → log link xác minh ra console để test.
// Production: thay bằng gửi email thật qua SES.
function sendVerificationEmail(email: string, token: string): void {
  logger.info(
    { email, verifyPath: `/api/auth/verify-email?token=${token}` },
    "Email verification link (DEV — chưa tích hợp SES, dùng link này để xác minh)",
  );
}

export type SessionResult = { token: string; refreshToken: string; user: User };
export type MfaChallenge = { mfaRequired: true; mfaToken: string };

export const authService = {
  async login(input: LoginInput): Promise<SessionResult | MfaChallenge> {
    const row = await authRepository.findByEmail(input.email);
    const passwordOk = await bcrypt.compare(input.password, row?.password_hash ?? DUMMY_HASH);
    if (!row || !passwordOk) throw new UnauthorizedError("Invalid credentials");
    if (row.status === "blocked") throw new ForbiddenError("Account is blocked");

    // Bật MFA → CHƯA cấp token; trả challenge để client nhập mã 6 số (bước 2).
    if (row.mfa_enabled) {
      return { mfaRequired: true, mfaToken: signMfaToken(row.id) };
    }

    const user = mapUser(row);
    logger.info({ userId: user.id, email: user.email }, "User logged in");
    return issueSession(user);
  },

  // Bước 2 của login khi có MFA: xác thực mã TOTP rồi cấp token.
  async verifyMfaLogin(input: MfaVerifyLoginInput): Promise<SessionResult> {
    let payload: { userId: string; purpose?: string };
    try {
      payload = jwt.verify(input.mfaToken, env.JWT_SECRET) as { userId: string; purpose?: string };
    } catch {
      throw new UnauthorizedError("MFA session expired, please login again");
    }
    if (payload.purpose !== "mfa") throw new UnauthorizedError("Invalid MFA token");

    const row = await authRepository.findById(payload.userId);
    if (!row) throw new UnauthorizedError("Invalid MFA token");
    if (row.status === "blocked") throw new ForbiddenError("Account is blocked");
    if (!row.mfa_enabled || !row.mfa_secret || !authenticator.verify({ token: input.code, secret: row.mfa_secret })) {
      throw new UnauthorizedError("Invalid MFA code");
    }

    const user = mapUser(row);
    logger.info({ userId: user.id }, "User logged in (MFA)");
    return issueSession(user);
  },

  async register(input: RegisterInput): Promise<SessionResult> {
    if (await authRepository.existsByEmail(input.email)) {
      throw new ConflictError("Email already exists");
    }
    // UUID thay cho Date.now(): tránh trùng PK khi 2 đăng ký cùng millisecond
    // (trùng sẽ bị catch isUniqueViolation báo nhầm "Email already exists").
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(input.email)}`;
    const emailVerifyToken = randomBytes(24).toString("hex");

    let row: UserRow;
    try {
      row = await authRepository.create({
        id,
        name: input.name,
        email: input.email,
        passwordHash,
        role: "user",
        avatar,
        phone: input.phone ?? null,
        emailVerifyToken,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError("Email already exists");
      throw err;
    }

    sendVerificationEmail(input.email, emailVerifyToken);
    const user = mapUser(row);
    logger.info({ userId: user.id, email: user.email }, "User registered");
    return issueSession(user);
  },

  // ─── Refresh / logout (token revocation + rotation) ──────────────────────
  // ROTATION: mỗi lần refresh cấp refresh token MỚI và thu hồi cái cũ.
  // REUSE DETECTION: nếu một refresh token ĐÃ bị thu hồi lại được dùng lại → nghi
  // bị đánh cắp (token rò rỉ bị dùng song song) → thu hồi TẤT cả token của user.
  async refresh(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const hash = sha256(refreshToken);
    const row = await authRepository.findRefreshToken(hash);
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }
    if (row.revoked) {
      // Token đã xoay vòng/logout mà còn dùng → cắt cả họ token, buộc đăng nhập lại.
      await authRepository.revokeAllRefreshTokens(row.user_id);
      logger.warn({ userId: row.user_id }, "Refresh token reuse detected — revoking all sessions");
      throw new UnauthorizedError("Refresh token reuse detected, please login again");
    }
    const userRow = await authRepository.findById(row.user_id);
    if (!userRow) throw new UnauthorizedError("Invalid refresh token");
    // Chặn user đã bị block (cắt phiên trong vòng tối đa = thời hạn access token).
    if (userRow.status === "blocked") {
      await authRepository.revokeRefreshToken(hash);
      throw new ForbiddenError("Account is blocked");
    }
    // Xoay vòng: thu hồi token vừa dùng, cấp cặp access + refresh mới.
    await authRepository.revokeRefreshToken(hash);
    const user = mapUser(userRow);
    const newRefreshToken = await issueRefreshToken(user.id);
    return { token: signToken(user), refreshToken: newRefreshToken };
  },

  async logout(refreshToken: string): Promise<void> {
    await authRepository.revokeRefreshToken(sha256(refreshToken));
  },

  async getById(id: string): Promise<User> {
    const row = await authRepository.findById(id);
    if (!row) throw new NotFoundError("User not found");
    return mapUser(row);
  },

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const row = await authRepository.findById(userId);
    if (!row) throw new NotFoundError("User not found");
    if (!(await bcrypt.compare(input.currentPassword, row.password_hash))) {
      throw new UnauthorizedError("Current password is incorrect");
    }
    await authRepository.updatePassword(userId, await bcrypt.hash(input.newPassword, BCRYPT_COST));
    // Đổi mật khẩu → thu hồi mọi refresh token cũ (buộc đăng nhập lại nơi khác).
    await authRepository.revokeAllRefreshTokens(userId);
    logger.info({ userId }, "Password changed");
  },

  // ─── Email verification ───────────────────────────────────────────────────
  async verifyEmail(token: string): Promise<void> {
    const userId = await authRepository.verifyEmailByToken(token);
    if (!userId) throw new BadRequestError("Invalid or expired verification token");
    logger.info({ userId }, "Email verified");
  },

  async resendVerification(userId: string): Promise<void> {
    const row = await authRepository.findById(userId);
    if (!row) throw new NotFoundError("User not found");
    if (row.email_verified) return;
    const token = randomBytes(24).toString("hex");
    await authRepository.setEmailVerifyToken(userId, token);
    sendVerificationEmail(row.email, token);
  },

  // ─── MFA / TOTP ─────────────────────────────────────────────────────────
  // Tạo secret + URL otpauth (FE render QR cho app authenticator quét).
  async mfaSetup(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const row = await authRepository.findById(userId);
    if (!row) throw new NotFoundError("User not found");
    const secret = authenticator.generateSecret();
    await authRepository.setMfaSecret(userId, secret);
    return { secret, otpauthUrl: authenticator.keyuri(row.email, MFA_ISSUER, secret) };
  },

  // Bật MFA sau khi user nhập đúng mã 6 số đầu tiên (xác nhận đã quét QR).
  async mfaEnable(userId: string, code: string): Promise<void> {
    const row = await authRepository.findById(userId);
    if (!row || !row.mfa_secret) throw new BadRequestError("Run MFA setup first");
    if (!authenticator.verify({ token: code, secret: row.mfa_secret })) {
      throw new UnauthorizedError("Invalid MFA code");
    }
    await authRepository.setMfaEnabled(userId, true);
    await authRepository.revokeAllRefreshTokens(userId);
    logger.info({ userId }, "MFA enabled");
  },

  async mfaDisable(userId: string, code: string): Promise<void> {
    const row = await authRepository.findById(userId);
    if (!row || !row.mfa_enabled || !row.mfa_secret) throw new BadRequestError("MFA not enabled");
    if (!authenticator.verify({ token: code, secret: row.mfa_secret })) {
      throw new UnauthorizedError("Invalid MFA code");
    }
    await authRepository.setMfaEnabled(userId, false);
    logger.info({ userId }, "MFA disabled");
  },
};

export type { UserRow };
