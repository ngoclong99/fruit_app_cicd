import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  slug: string;
  parent_id: string | null;
  level: number | string;
}

function mapRow(row: CategoryRow) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    slug: row.slug,
    parentId: row.parent_id ?? null,
    level: Number(row.level),
  };
}

router.get('/tree', async (_req: Request, res: Response): Promise<void> => {
  const result = await pool.query<CategoryRow>(
    'SELECT id, name, icon, slug, parent_id, level FROM categories ORDER BY level ASC, id ASC'
  );

  type CatNode = ReturnType<typeof mapRow> & { children: CatNode[] };
  const map = new Map<string, CatNode>();
  for (const row of result.rows) map.set(row.id, { ...mapRow(row), children: [] });

  const roots: CatNode[] = [];
  for (const row of result.rows) {
    if (row.parent_id) map.get(row.parent_id)?.children.push(map.get(row.id)!);
    else roots.push(map.get(row.id)!);
  }

  res.json(roots);
});

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const result = await pool.query<CategoryRow>(
    'SELECT id, name, icon, slug, parent_id, level FROM categories ORDER BY level ASC, id ASC'
  );
  res.json(result.rows.map(mapRow));
});

router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  const result = await pool.query<CategoryRow>(
    'SELECT id, name, icon, slug, parent_id, level FROM categories WHERE slug = $1',
    [req.params.slug]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }
  res.json(mapRow(result.rows[0]));
});

export default router;
