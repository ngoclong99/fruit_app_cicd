import { Request, Response, Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest, requireAdmin } from "../middleware/auth";
import type { Product } from "../types";

const router = Router();

interface ProductRow {
  id: string;
  name_vi: string;
  name_en: string | null;
  name_key: string | null;
  price: string | number;
  original_price: string | number | null;
  image: string;
  images: string[] | null;
  category: string;
  unit: string;
  stock: number | string;
  description: string | null;
  origin: string | null;
  rating: string | number;
  review_count: number | string;
  badge: 'new' | 'sale' | 'hot' | null;
  tags: string[] | null;
  created_at: Date | string;
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name_vi,
    nameVi: row.name_vi,
    nameEn: row.name_en ?? undefined,
    nameKey: row.name_key ?? undefined,
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    image: row.image,
    images: row.images ?? undefined,
    category: row.category,
    unit: row.unit,
    stock: Number(row.stock),
    description: row.description ?? '',
    origin: row.origin ?? '',
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    badge: row.badge ?? undefined,
    tags: row.tags ?? undefined,
  };
}

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { category, search, badge, sort, page = "1", limit = "12" } =
    req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (category) {
    // Recursive CTE: tim tat ca slug con (sub-categories) cua slug duoc chon
    const catResult = await pool.query<{ slug: string }>(
      `WITH RECURSIVE cat_tree AS (
         SELECT id, slug FROM categories WHERE slug = $1
         UNION ALL
         SELECT c.id, c.slug FROM categories c
         INNER JOIN cat_tree ct ON c.parent_id = ct.id
       )
       SELECT slug FROM cat_tree`,
      [category]
    );
    const slugs = catResult.rows.map((r) => r.slug);
    if (slugs.length > 0) {
      const placeholders = slugs.map((_, i) => `$${params.length + i + 1}`).join(",");
      conditions.push(`category IN (${placeholders})`);
      params.push(...slugs);
    }
  }
  if (badge) {
    params.push(badge);
    conditions.push(`badge = $${params.length}`);
  }
  if (search) {
    const q = `%${search.toLowerCase()}%`;
    params.push(q, q);
    conditions.push(
      `(LOWER(name_vi) LIKE $${params.length - 1} OR LOWER(COALESCE(name_en,'')) LIKE $${params.length})`
    );
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy = "ORDER BY created_at DESC";
  if (sort === "price_asc") orderBy = "ORDER BY price ASC";
  else if (sort === "price_desc") orderBy = "ORDER BY price DESC";
  else if (sort === "rating") orderBy = "ORDER BY rating DESC";
  else if (sort === "newest") orderBy = "ORDER BY created_at DESC";

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text as total FROM products ${where}`,
    params
  );
  const total = Number(countResult.rows[0].total);

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const rowsResult = await pool.query<ProductRow>(
    `SELECT * FROM products ${where} ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limitNum, offset]
  );

  res.json({
    data: rowsResult.rows.map(mapProduct),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const result = await pool.query<ProductRow>(
    "SELECT * FROM products WHERE id = $1",
    [req.params.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(mapProduct(result.rows[0]));
});

router.post(
  "/",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const body = req.body as Omit<Product, "id">;
    const id = String(Date.now());
    const result = await pool.query<ProductRow>(
      `INSERT INTO products (id, name_vi, name_en, name_key, price, original_price, image, images, category, unit, stock, description, origin, rating, review_count, badge, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
      [
        id,
        body.nameVi ?? body.name,
        body.nameEn ?? null,
        body.nameKey ?? null,
        body.price,
        body.originalPrice ?? null,
        body.image,
        body.images ? JSON.stringify(body.images) : null,
        body.category,
        body.unit,
        body.stock ?? 0,
        body.description,
        body.origin,
        body.rating ?? 5,
        body.reviewCount ?? 0,
        body.badge ?? null,
        body.tags ? JSON.stringify(body.tags) : null,
      ]
    );
    res.status(201).json(mapProduct(result.rows[0]));
  }
);

router.put(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const existing = await pool.query<{ id: string }>(
      "SELECT id FROM products WHERE id = $1",
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    const body = req.body as Partial<Product>;
    const fields: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown) => {
      vals.push(val);
      fields.push(`${col} = $${vals.length}`);
    };

    if (body.nameVi !== undefined || body.name !== undefined) push("name_vi", body.nameVi ?? body.name);
    if (body.nameEn !== undefined) push("name_en", body.nameEn);
    if (body.nameKey !== undefined) push("name_key", body.nameKey);
    if (body.price !== undefined) push("price", body.price);
    if (body.originalPrice !== undefined) push("original_price", body.originalPrice);
    if (body.image !== undefined) push("image", body.image);
    if (body.images !== undefined) push("images", JSON.stringify(body.images));
    if (body.category !== undefined) push("category", body.category);
    if (body.unit !== undefined) push("unit", body.unit);
    if (body.stock !== undefined) push("stock", body.stock);
    if (body.description !== undefined) push("description", body.description);
    if (body.origin !== undefined) push("origin", body.origin);
    if (body.badge !== undefined) push("badge", body.badge);
    if (body.tags !== undefined) push("tags", JSON.stringify(body.tags));

    if (fields.length > 0) {
      vals.push(req.params.id);
      await pool.query(
        `UPDATE products SET ${fields.join(", ")} WHERE id = $${vals.length}`,
        vals
      );
    }
    const result = await pool.query<ProductRow>(
      "SELECT * FROM products WHERE id = $1",
      [req.params.id]
    );
    res.json(mapProduct(result.rows[0]));
  }
);

router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const existing = await pool.query<{ id: string }>(
      "SELECT id FROM products WHERE id = $1",
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    res.status(204).send();
  }
);

export default router;
