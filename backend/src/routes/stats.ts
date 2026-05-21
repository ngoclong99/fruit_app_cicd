import { Router, Response } from 'express';
import pool from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { parseIntDefault, requireDate } from '../utils/validate';
import type { CartItem, Order } from '../types';

const router = Router();

router.get('/', authenticate, requireAdmin, asyncHandler(async (_req: AuthRequest, res: Response) => {
  const revenue = await pool.query<{ total: string }>(
    "SELECT COALESCE(SUM(total), 0)::text as total FROM orders WHERE status = 'delivered'"
  );
  const orderCount = await pool.query<{ total: string }>('SELECT COUNT(*)::text as total FROM orders');
  const userCount = await pool.query<{ total: string }>(
    "SELECT COUNT(*)::text as total FROM users WHERE role = 'user'"
  );
  const productCount = await pool.query<{ total: string }>('SELECT COUNT(*)::text as total FROM products');

  const statusResult = await pool.query<{ status: string; count: string }>(
    'SELECT status, COUNT(*)::text as count FROM orders GROUP BY status'
  );
  const statusCounts: Record<string, number> = {};
  for (const row of statusResult.rows) statusCounts[row.status] = Number(row.count);

  const now = new Date();
  const monthlyRevenue = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return pool
        .query<{ revenue: string }>(
          "SELECT COALESCE(SUM(total), 0)::text as revenue FROM orders WHERE status = 'delivered' AND TO_CHAR(created_at, 'YYYY-MM') = $1",
          [month]
        )
        .then((r) => ({ month, revenue: Number(r.rows[0].revenue) }));
    })
  );

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

  const recentResult = await pool.query<OrderRow>(
    'SELECT * FROM orders ORDER BY created_at DESC LIMIT 5'
  );
  const recentOrders = recentResult.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    items: row.items,
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    address: row.address,
    phone: row.phone,
    note: row.note ?? undefined,
  }));

  res.json({
    totalRevenue: Number(revenue.rows[0].total),
    totalOrders: Number(orderCount.rows[0].total),
    totalUsers: Number(userCount.rows[0].total),
    totalProducts: Number(productCount.rows[0].total),
    statusCounts,
    monthlyRevenue,
    recentOrders,
  });
}));

router.get('/daily', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const from = requireDate(req.query.from, 'from');
  const to = requireDate(req.query.to, 'to');
  if (from > to) {
    res.status(400).json({ message: 'from must be <= to' });
    return;
  }

  const result = await pool.query<{ date: Date | string; orders: string; revenue: string }>(
    `SELECT created_at::date as date, COUNT(*)::text as orders, COALESCE(SUM(total), 0)::text as revenue
     FROM orders
     WHERE created_at::date >= $1 AND created_at::date <= $2
     GROUP BY created_at::date
     ORDER BY date ASC`,
    [from, to]
  );

  res.json(result.rows.map((r) => ({
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
    orders: Number(r.orders),
    revenue: Number(r.revenue),
  })));
}));

router.get('/top-products', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = parseIntDefault(req.query.limit, 10, 1, 100);
  const result = await pool.query<{
    product_id: string;
    product_name: string;
    image: string | null;
    total_qty: string;
    total_revenue: string;
  }>(
    `SELECT
       item->'product'->>'id'    AS product_id,
       item->'product'->>'name'  AS product_name,
       item->'product'->>'image' AS image,
       SUM((item->>'quantity')::int)::text AS total_qty,
       SUM(((item->'product'->>'price')::numeric) * (item->>'quantity')::int)::text AS total_revenue
     FROM orders o, jsonb_array_elements(o.items) AS item
     WHERE o.status = 'delivered'
     GROUP BY product_id, product_name, image
     ORDER BY SUM((item->>'quantity')::int) DESC
     LIMIT $1`,
    [limit]
  );
  res.json(result.rows.map((r) => ({
    productId: r.product_id,
    name: r.product_name,
    image: r.image ?? undefined,
    quantity: Number(r.total_qty),
    revenue: Number(r.total_revenue),
  })));
}));

router.get('/top-customers', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = parseIntDefault(req.query.limit, 10, 1, 100);
  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    order_count: string;
    total_spent: string;
  }>(
    `SELECT u.id, u.name, u.email,
       COUNT(o.id)::text AS order_count,
       COALESCE(SUM(o.total), 0)::text AS total_spent
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'delivered'
     WHERE u.role = 'user'
     GROUP BY u.id, u.name, u.email
     HAVING COUNT(o.id) > 0
     ORDER BY SUM(o.total) DESC NULLS LAST
     LIMIT $1`,
    [limit]
  );
  res.json(result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    orderCount: Number(r.order_count),
    totalSpent: Number(r.total_spent),
  })));
}));

router.get('/by-category', authenticate, requireAdmin, asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query<{
    category: string;
    total_qty: string;
    revenue: string;
  }>(
    `SELECT
       item->'product'->>'category' AS category,
       SUM((item->>'quantity')::int)::text AS total_qty,
       SUM(((item->'product'->>'price')::numeric) * (item->>'quantity')::int)::text AS revenue
     FROM orders o, jsonb_array_elements(o.items) AS item
     WHERE o.status = 'delivered'
     GROUP BY category
     ORDER BY SUM(((item->'product'->>'price')::numeric) * (item->>'quantity')::int) DESC`
  );
  res.json(result.rows.map((r) => ({
    category: r.category,
    quantity: Number(r.total_qty),
    revenue: Number(r.revenue),
  })));
}));

export default router;
