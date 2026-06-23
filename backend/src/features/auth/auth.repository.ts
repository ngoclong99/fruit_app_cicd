import pool from "@/db";
import { mapUser, type UserRow } from "@/shared/db/userMapper";

// Re-export để các import cũ (`from "./auth.repository"`) vẫn hoạt động.
export { mapUser, type UserRow };

export const authRepository = {
  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0] ?? null;
  },

  async findById(id: string): Promise<UserRow | null> {
    const result = await pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0] ?? null;
  },

  async existsByEmail(email: string): Promise<boolean> {
    const result = await pool.query<{ id: string }>("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
    return result.rows.length > 0;
  },

  async create(input: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: "admin" | "user";
    avatar: string;
    phone: string | null;
    emailVerifyToken: string;
  }): Promise<UserRow> {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (id, name, email, password_hash, role, avatar, status, phone, email_verify_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [input.id, input.name, input.email, input.passwordHash, input.role, input.avatar, "active", input.phone, input.emailVerifyToken],
    );
    return result.rows[0];
  },

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, id]);
  },

  // ─── Refresh tokens (revocation) ──────────────────────────────────────────
  async createRefreshToken(input: { tokenHash: string; userId: string; expiresAt: Date }): Promise<void> {
    await pool.query(
      "INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [input.tokenHash, input.userId, input.expiresAt],
    );
  },

  async findRefreshToken(
    tokenHash: string,
  ): Promise<{ user_id: string; expires_at: Date; revoked: boolean } | null> {
    const result = await pool.query<{ user_id: string; expires_at: Date; revoked: boolean }>(
      "SELECT user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1",
      [tokenHash],
    );
    return result.rows[0] ?? null;
  },

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await pool.query("UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1", [tokenHash]);
  },

  /** Thu hồi TẤT cả refresh token của user (vd khi đổi mật khẩu / bật-tắt MFA). */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await pool.query("UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE", [userId]);
  },

  // Chỉ xoá token ĐÃ HẾT HẠN. KHÔNG xoá token revoked-nhưng-còn-hạn: phải giữ lại
  // để reuse-detection (refresh() phát hiện token đã xoay vòng bị dùng lại). Sau khi
  // hết hạn thì xoá → bảng vẫn bị chặn tăng (cửa sổ tối đa = thời hạn refresh token).
  async deleteExpiredRefreshTokens(): Promise<void> {
    await pool.query("DELETE FROM refresh_tokens WHERE expires_at < NOW()");
  },

  // ─── Email verification ───────────────────────────────────────────────────
  async setEmailVerifyToken(userId: string, token: string): Promise<void> {
    await pool.query("UPDATE users SET email_verify_token = $1 WHERE id = $2", [token, userId]);
  },

  /** Xác minh email theo token (1 lần). Trả về user_id nếu hợp lệ, null nếu không. */
  async verifyEmailByToken(token: string): Promise<string | null> {
    const result = await pool.query<{ id: string }>(
      `UPDATE users SET email_verified = TRUE, email_verify_token = NULL
       WHERE email_verify_token = $1 RETURNING id`,
      [token],
    );
    return result.rows[0]?.id ?? null;
  },

  // ─── MFA (TOTP) ───────────────────────────────────────────────────────────
  async setMfaSecret(userId: string, secret: string): Promise<void> {
    await pool.query("UPDATE users SET mfa_secret = $1 WHERE id = $2", [secret, userId]);
  },

  async setMfaEnabled(userId: string, enabled: boolean): Promise<void> {
    await pool.query(
      "UPDATE users SET mfa_enabled = $1, mfa_secret = CASE WHEN $1 THEN mfa_secret ELSE NULL END WHERE id = $2",
      [enabled, userId],
    );
  },
};
