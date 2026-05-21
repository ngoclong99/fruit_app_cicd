import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { asyncHandler, badRequest, conflict, forbidden, notFound } from '../middleware/errorHandler';
import {
  optionalEnum,
  optionalPhone,
  optionalString,
  requireEmail,
  requireEnum,
  requireString,
} from '../utils/validate';
import type { User } from '../types';

const router = Router();

const USER_ROLES = ['admin', 'user'] as const;
const USER_STATUSES = ['active', 'blocked'] as const;

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar: string | null;
  status: 'active' | 'blocked';
  phone: string | null;
  created_at: Date | string;
  order_count: number | string;
  total_spent: number | string;
}

function mapUser(row: UserRow): User {
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

router.post('/', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const name = requireString(req.body?.name, 'name', 255);
  const email = requireEmail(req.body?.email);
  const password = requireString(req.body?.password, 'password', 200);
  if (password.length < 6) throw badRequest('Password must be at least 6 characters');
  const phone = optionalPhone(req.body?.phone);
  const role = optionalEnum(req.body?.role, USER_ROLES, 'role') ?? 'user';
  const status = optionalEnum(req.body?.status, USER_STATUSES, 'status') ?? 'active';

  const existing = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) throw conflict('Email already exists');

  const id = `${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 10);
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;
  const result = await pool.query<UserRow>(
    `INSERT INTO users (id, name, email, password_hash, role, avatar, status, phone)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id, name, email, passwordHash, role, avatar, status, phone ?? null]
  );
  res.status(201).json(mapUser(result.rows[0]));
}));

router.get('/', authenticate, requireAdmin, asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query<UserRow>(`
    SELECT u.*,
      COALESCE(o.order_count, 0) AS order_count,
      COALESCE(o.total_spent, 0) AS total_spent
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS order_count, SUM(total) AS total_spent
      FROM orders GROUP BY user_id
    ) o ON o.user_id = u.id
    ORDER BY u.created_at DESC
  `);
  res.json(result.rows.map(mapUser));
}));

router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin' && req.user?.userId !== req.params.id) throw forbidden();
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) throw notFound('User not found');
  res.json(mapUser(result.rows[0]));
}));

router.put('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin' && req.user?.userId !== req.params.id) throw forbidden();
  const existing = await pool.query<{ id: string }>('SELECT id FROM users WHERE id = $1', [req.params.id]);
  if (existing.rows.length === 0) throw notFound('User not found');

  const body = (req.body ?? {}) as Partial<User>;
  const isAdmin = req.user?.role === 'admin';
  const fields: string[] = [];
  const vals: unknown[] = [];
  const push = (col: string, val: unknown) => { vals.push(val); fields.push(`${col} = $${vals.length}`); };

  if (body.name !== undefined) push('name', optionalString(body.name, 'name', 255) ?? null);
  if (body.phone !== undefined) push('phone', optionalPhone(body.phone) ?? null);
  if (body.avatar !== undefined) push('avatar', optionalString(body.avatar, 'avatar', 500) ?? null);
  if (isAdmin) {
    if (body.status !== undefined) push('status', requireEnum(body.status, USER_STATUSES, 'status'));
    if (body.role !== undefined) push('role', requireEnum(body.role, USER_ROLES, 'role'));
  }

  if (fields.length > 0) {
    vals.push(req.params.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${vals.length}`, vals);
  }
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.params.id]);
  res.json(mapUser(result.rows[0]));
}));

router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await pool.query<{ id: string; role: string }>(
    'SELECT id, role FROM users WHERE id = $1', [req.params.id]
  );
  if (existing.rows.length === 0) throw notFound('User not found');
  if (existing.rows[0].role === 'admin') throw forbidden('Cannot delete admin');
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

router.patch('/:id/status', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const status = requireEnum(req.body?.status, USER_STATUSES, 'status');
  const existing = await pool.query<{ id: string }>('SELECT id FROM users WHERE id = $1', [req.params.id]);
  if (existing.rows.length === 0) throw notFound('User not found');

  const result = await pool.query<UserRow>(
    'UPDATE users SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  res.json(mapUser(result.rows[0]));
}));

export default router;
