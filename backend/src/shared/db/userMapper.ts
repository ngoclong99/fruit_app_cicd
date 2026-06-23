import type { User } from "@/types";

// Hàng `users` đọc từ DB (SELECT * / RETURNING *). Dùng CHUNG cho mọi nơi map user
// để tránh trùng lặp định nghĩa (trước đây auth.repository và routes/users.ts có
// 2 bản UserRow/mapUser lệch nhau — admin view thiếu email_verified/mfa_enabled).
export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "admin" | "user";
  avatar: string | null;
  status: "active" | "blocked";
  phone: string | null;
  created_at: Date | string;
  order_count: number | string;
  total_spent: number | string;
  email_verified: boolean;
  mfa_enabled: boolean;
  mfa_secret: string | null;
}

/** Map hàng DB → User trả ra API. KHÔNG bao giờ lộ password_hash / mfa_secret. */
export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar ?? undefined,
    status: row.status,
    phone: row.phone ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    orderCount: Number(row.order_count),
    totalSpent: Number(row.total_spent),
    emailVerified: row.email_verified ?? false,
    mfaEnabled: row.mfa_enabled ?? false,
  };
}
