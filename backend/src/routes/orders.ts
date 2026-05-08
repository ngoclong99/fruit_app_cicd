import { Router, Response } from 'express';
import pool from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import type { Order, CartItem } from '../types';

const router = Router();

interface OrderRow {
  id: string;
  user_id: string;
  items: CartItem[];
  total: string | number;
  status: Order['status'];
  created_at: Date | string;
  address: string;
  phone: string;
  note: string | null;
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    items: row.items,
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    address: row.address,
    phone: row.phone,
    note: row.note ?? undefined,
  };
}

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, from, to, page = '1', limit = '10' } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (req.user?.role !== 'admin') {
    params.push(req.user!.userId);
    conditions.push(`user_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`created_at::date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`created_at::date <= $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text as total FROM orders ${where}`,
    params
  );
  const total = Number(countResult.rows[0].total);

  const rowsResult = await pool.query<OrderRow>(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limitNum, offset]
  );

  res.json({
    data: rowsResult.rows.map(mapOrder),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await pool.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }
  if (req.user?.role !== 'admin' && result.rows[0].user_id !== req.user?.userId) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  res.json(mapOrder(result.rows[0]));
});

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as { items: CartItem[]; total: number; address: string; phone: string; note?: string };
  const id = `ORD-${String(Date.now()).slice(-8)}`;
  const result = await pool.query<OrderRow>(
    `INSERT INTO orders (id, user_id, items, total, status, address, phone, note)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8) RETURNING *`,
    [id, req.user!.userId, JSON.stringify(body.items), body.total, 'pending', body.address, body.phone, body.note ?? null]
  );
  await pool.query(
    'UPDATE users SET order_count = order_count + 1, total_spent = total_spent + $1 WHERE id = $2',
    [body.total, req.user!.userId]
  );
  res.status(201).json(mapOrder(result.rows[0]));
});

router.patch('/:id/status', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await pool.query<{ id: string }>('SELECT id FROM orders WHERE id = $1', [req.params.id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }
  const { status } = req.body as { status: Order['status'] };
  const result = await pool.query<OrderRow>(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  res.json(mapOrder(result.rows[0]));
});

router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await pool.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }
  const order = result.rows[0];
  if (req.user?.role !== 'admin' && order.user_id !== req.user?.userId) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  if (order.status !== 'pending') {
    res.status(400).json({ message: 'Only pending orders can be cancelled' });
    return;
  }
  const updated = await pool.query<OrderRow>(
    "UPDATE orders SET status = 'cancelled' WHERE id = $1 RETURNING *",
    [req.params.id]
  );
  res.json(mapOrder(updated.rows[0]));
});

export default router;
