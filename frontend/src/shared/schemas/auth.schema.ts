import { z } from "zod";

/**
 * Auth schemas — these should match the backend's auth.schema.ts.
 * In a monorepo, ideally share this file via workspace package.
 * For now: keep them manually in sync.
 */

export const emailSchema = z.string().email("Email không hợp lệ").max(255).toLowerCase();
export const passwordSchema = z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(200);
export const phoneSchema = z
  .string()
  .regex(/^[0-9+\-\s()]{8,20}$/, "Số điện thoại không hợp lệ");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu").max(200),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, "Vui lòng nhập tên").max(255).trim(),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
    phone: phoneSchema.optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại").max(200),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmNewPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
