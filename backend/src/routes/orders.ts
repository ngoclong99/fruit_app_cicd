import { Router, Response } from 'express';
import pool from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { asyncHandler, badRequest, forbidden, notFound } from '../middleware/errorHandler';
import {
  optionalDate,
  optionalEnum,
  optionalString,
  parseIntDefault,
  requireEnum,
  requireNonNegNumber,
  requirePhone,
  requirePositiveInt,
  requireString,
} from '../utils/validate';
import type { Order, CartItem } from '../types';

const router = Router();

const ORDER_STATUSES = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'] as const;

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

function validateCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw badRequest('items must be a non-empty array');
  }
  for (const item of value) {
    if (!item || typeof item !== 'object') throw badRequest('Invalid cart item');
    const it = item as Partial<CartItem>;
    if (!it.product || typeof it.product !== 'object' || typeof it.product.id !== 'string') {
      throw badRequest('Invalid cart item: missing product');
    }
    requirePositiveInt(it.quantity, 'item.quantity');
  }
  return value as CartItem[];
}

router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const status = optionalEnum(req.query.status, ORDER_STATUSES, 'status');
  const from = optionalDate(req.query.from, 'from');
  const to = optionalDate(req.query.to, 'to');
  const page = parseIntDefault(req.query.page, 1, 1, 10000);
  const limit = parseIntDefault(req.query.limit, 10, 1, 1000);

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
  const offset = (page - 1) * limit;

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text as total FROM orders ${where}`,
    params
  );
  const total = Number(countResult.rows[0].total);

  const rowsResult = await pool.query<OrderRow>(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.json({
    data: rowsResult.rows.map(mapOrder),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}));

router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await pool.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) throw notFound('Order not found');
  if (req.user?.role !== 'admin' && result.rows[0].user_id !== req.user?.userId) {
    throw forbidden();
  }
  res.json(mapOrder(result.rows[0]));
}));

router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const items = validateCartItems(req.body?.items);
  const total = requireNonNegNumber(req.body?.total, 'total');
  const address = requireString(req.body?.address, 'address', 500);
  const phone = requirePhone(req.body?.phone);
  const note = optionalString(req.body?.note, 'note', 1000);

  const id = `ORD-${String(Date.now()).slice(-8)}`;
  const result = await pool.query<OrderRow>(
    `INSERT INTO orders (id, user_id, items, total, status, address, phone, note)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8) RETURNING *`,
    [id, req.user!.userId, JSON.stringify(items), total, 'pending', address, phone, note ?? null]
  );
  await pool.query(
    'UPDATE users SET order_count = order_count + 1, total_spent = total_spent + $1 WHERE id = $2',
    [total, req.user!.userId]
  );
  res.status(201).json(mapOrder(result.rows[0]));
}));

router.patch('/:id/status', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const status = requireEnum(req.body?.status, ORDER_STATUSES, 'status');
  const existing = await pool.query<{ id: string }>('SELECT id FROM orders WHERE id = $1', [req.params.id]);
  if (existing.rows.length === 0) throw notFound('Order not found');

  const result = await pool.query<OrderRow>(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  res.json(mapOrder(result.rows[0]));
}));

router.patch('/:id/cancel', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await pool.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) throw notFound('Order not found');
  const order = result.rows[0];
  if (req.user?.role !== 'admin' && order.user_id !== req.user?.userId) throw forbidden();
  if (order.status !== 'pending') throw badRequest('Only pending orders can be cancelled');

  const updated = await pool.query<OrderRow>(
    "UPDATE orders SET status = 'cancelled' WHERE id = $1 RETURNING *",
    [req.params.id]
  );
  res.json(mapOrder(updated.rows[0]));
}));

export default router;
