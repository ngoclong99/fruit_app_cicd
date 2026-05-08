import { Router, Response } from 'express';
import pool from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import type { CartItem, Order } from '../types';

const router = Router();

router.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
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
});

router.get('/daily', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { from, to } = req.query as Record<string, string>;
  if (!from || !to) {
    res.status(400).json({ message: 'from and to are required' });
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
});

export default router;
