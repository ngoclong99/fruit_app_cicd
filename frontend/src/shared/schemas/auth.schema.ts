import { z } from "zod";

/**
 * Auth schemas — error messages là **i18n keys** (vd `"auth.emailInvalid"`).
 * Component nhận error.message rồi gọi `t(error.message)` để dịch.
 *
 * Lý do dùng key thay vì raw string:
 *   - Cùng schema dùng cho cả vi + en (không lệ thuộc ngôn ngữ)
 *   - Đổi wording chỉ sửa vi.json / en.json — không đụng schema
 *
 * Trong component:
 *   {errors.email?.message && t(errors.email.message)}
 *
 * Backend có schema tương đương (backend/src/features/auth/auth.schema.ts)
 * nhưng dùng raw English/Vietnamese vì BE không biết ngôn ngữ user.
 */

export const emailSchema = z.string().email("auth.emailInvalid").max(255).toLowerCase();
export const passwordSchema = z.string().min(6, "auth.passwordMin").max(200);
export const phoneSchema = z
  .string()
  .regex(/^[0-9+\-\s()]{8,20}$/, "auth.phoneInvalid");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "auth.passwordRequired").max(200),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, "auth.nameRequired").max(255).trim(),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "auth.confirmPasswordRequired"),
    phone: phoneSchema.optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.passwordMismatch",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "auth.currentPasswordRequired").max(200),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "auth.confirmNewPasswordRequired"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "auth.passwordMismatch",
    path: ["confirmNewPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
