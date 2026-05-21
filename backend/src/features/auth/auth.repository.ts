import pool from "../../db";
import type { User } from "../../types";

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
}

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
  };
}

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
  }): Promise<UserRow> {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (id, name, email, password_hash, role, avatar, status, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [input.id, input.name, input.email, input.passwordHash, input.role, input.avatar, "active", input.phone],
    );
    return result.rows[0];
  },

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, id]);
  },
};
