import { Router, Response } from 'express';
import pool from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import type { User } from '../types';

const router = Router();

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

router.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
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
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin' && req.user?.userId !== req.params.id) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(mapUser(result.rows[0]));
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin' && req.user?.userId !== req.params.id) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const existing = await pool.query<{ id: string }>('SELECT id FROM users WHERE id = $1', [req.params.id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  const allowed: (keyof User)[] = req.user?.role === 'admin'
    ? ['name', 'phone', 'avatar', 'status', 'role']
    : ['name', 'phone', 'avatar'];
  const body = req.body as Partial<User>;
  const fields: string[] = [];
  const vals: unknown[] = [];
  const colMap: Partial<Record<keyof User, string>> = {
    name: 'name', phone: 'phone', avatar: 'avatar', status: 'status', role: 'role'
  };
  for (const key of allowed) {
    if (body[key] !== undefined) {
      vals.push(body[key]);
      fields.push(`${colMap[key]} = $${vals.length}`);
    }
  }
  if (fields.length > 0) {
    vals.push(req.params.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${vals.length}`, vals);
  }
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.params.id]);
  res.json(mapUser(result.rows[0]));
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await pool.query<{ id: string; role: string }>(
    'SELECT id, role FROM users WHERE id = $1', [req.params.id]
  );
  if (existing.rows.length === 0) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  if (existing.rows[0].role === 'admin') {
    res.status(403).json({ message: 'Cannot delete admin' });
    return;
  }
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

router.patch('/:id/status', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await pool.query<{ id: string }>('SELECT id FROM users WHERE id = $1', [req.params.id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  const { status } = req.body as { status: 'active' | 'blocked' };
  const result = await pool.query<UserRow>(
    'UPDATE users SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  res.json(mapUser(result.rows[0]));
});

export default router;
