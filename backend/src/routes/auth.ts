import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { authenticate, JWT_SECRET, AuthRequest } from '../middleware/auth';
import { asyncHandler, badRequest, conflict, forbidden, notFound, unauthorized } from '../middleware/errorHandler';
import { optionalPhone, requireEmail, requireString } from '../utils/validate';
import type { User } from '../types';

const router = Router();

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
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

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const email = requireEmail(req.body?.email);
  const password = requireString(req.body?.password, 'password', 200);

  const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
  const row = result.rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    throw unauthorized('Invalid credentials');
  }
  if (row.status === 'blocked') throw forbidden('Account is blocked');

  const user = mapUser(row);
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
}));

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const name = requireString(req.body?.name, 'name', 255);
  const email = requireEmail(req.body?.email);
  const password = requireString(req.body?.password, 'password', 200);
  const phone = optionalPhone(req.body?.phone);

  if (password.length < 6) throw badRequest('Password must be at least 6 characters');

  const existing = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) throw conflict('Email already exists');

  const id = `${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 10);
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;
  const result = await pool.query<UserRow>(
    `INSERT INTO users (id, name, email, password_hash, role, avatar, status, phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [id, name, email, passwordHash, 'user', avatar, 'active', phone ?? null]
  );
  const user = mapUser(result.rows[0]);
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user });
}));

router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.userId]);
  if (result.rows.length === 0) throw notFound('User not found');
  res.json(mapUser(result.rows[0]));
}));

router.patch('/change-password', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const currentPassword = requireString(req.body?.currentPassword, 'currentPassword', 200);
  const newPassword = requireString(req.body?.newPassword, 'newPassword', 200);
  if (newPassword.length < 6) throw badRequest('New password must be at least 6 characters');

  const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.userId]);
  if (result.rows.length === 0) throw notFound('User not found');
  if (!(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
    throw unauthorized('Current password is incorrect');
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user!.userId]);
  res.json({ message: 'Password changed successfully' });
}));

export default router;
