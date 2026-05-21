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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
