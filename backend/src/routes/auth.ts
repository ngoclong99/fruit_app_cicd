import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { authenticate, JWT_SECRET, AuthRequest } from '../middleware/auth';
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

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password required' });
    return;
  }
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
  const row = result.rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }
  if (row.status === 'blocked') {
    res.status(403).json({ message: 'Account is blocked' });
    return;
  }
  const user = mapUser(row);
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, phone } = req.body as { name: string; email: string; password: string; phone?: string };
  if (!name || !email || !password) {
    res.status(400).json({ message: 'Name, email and password required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters' });
    return;
  }
  const existing = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    res.status(409).json({ message: 'Email already exists' });
    return;
  }
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
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.userId]);
  if (result.rows.length === 0) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(mapUser(result.rows[0]));
});

router.patch('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: 'currentPassword and newPassword required' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ message: 'New password must be at least 6 characters' });
    return;
  }
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.userId]);
  if (result.rows.length === 0) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  if (!(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
    res.status(401).json({ message: 'Current password is incorrect' });
    return;
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user!.userId]);
  res.json({ message: 'Password changed successfully' });
});

export default router;
