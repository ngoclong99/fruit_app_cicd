import { z } from "zod";

export const emailSchema = z.string().email("Invalid email format").max(255).toLowerCase();
export const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(200);
export const phoneSchema = z.string().regex(/^[0-9+\-\s()]{8,20}$/, "Invalid phone format");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(200),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).trim(),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});

// Refresh token (revocation) — gửi token thô trong body để đổi lấy access token mới.
export const refreshSchema = z.object({
  refreshToken: z.string().min(10).max(200),
});

// MFA (TOTP) — code 6 chữ số từ app authenticator.
const totpCode = z.string().regex(/^\d{6}$/, "MFA code must be 6 digits");
export const mfaCodeSchema = z.object({ code: totpCode });
export const mfaVerifyLoginSchema = z.object({
  mfaToken: z.string().min(10), // token tạm sau bước nhập mật khẩu đúng
  code: totpCode,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type MfaCodeInput = z.infer<typeof mfaCodeSchema>;
export type MfaVerifyLoginInput = z.infer<typeof mfaVerifyLoginSchema>;
