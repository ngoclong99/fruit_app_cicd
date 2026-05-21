import { Request, Response, Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest, requireAdmin } from "../middleware/auth";
import { asyncHandler, notFound } from "../middleware/errorHandler";
import {
  optionalEnum,
  optionalString,
  parseIntDefault,
  requireNonNegInt,
  requireNonNegNumber,
  requireString,
} from "../utils/validate";
import type { Product } from "../types";

const router = Router();

const BADGE_VALUES = ["new", "sale", "hot"] as const;
const SORT_VALUES = ["price_asc", "price_desc", "rating", "newest"] as const;

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

function ensureStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value as string[];
}

router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const category = optionalString(req.query.category, 'category', 100);
  const search = optionalString(req.query.search, 'search', 200);
  const badge = optionalEnum(req.query.badge, BADGE_VALUES, 'badge');
  const sort = optionalEnum(req.query.sort, SORT_VALUES, 'sort');
  const page = parseIntDefault(req.query.page, 1, 1, 10000);
  const limit = parseIntDefault(req.query.limit, 12, 1, 1000);

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (category) {
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
    } else {
      // Unknown category → return empty result, no SQL errors
      res.json({ data: [], total: 0, page, limit, totalPages: 0 });
      return;
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

  const offset = (page - 1) * limit;

  const rowsResult = await pool.query<ProductRow>(
    `SELECT * FROM products ${where} ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.json({
    data: rowsResult.rows.map(mapProduct),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}));

router.get("/:id", asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query<ProductRow>(
    "SELECT * FROM products WHERE id = $1",
    [req.params.id]
  );
  if (result.rows.length === 0) throw notFound("Product not found");
  res.json(mapProduct(result.rows[0]));
}));

router.post(
  "/",
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = (req.body ?? {}) as Partial<Product>;
    const nameVi = requireString(body.nameVi ?? body.name, 'name', 255);
    const price = requireNonNegNumber(body.price, 'price');
    const image = requireString(body.image, 'image', 500);
    const category = requireString(body.category, 'category', 100);
    const unit = requireString(body.unit, 'unit', 50);
    const stock = body.stock !== undefined ? requireNonNegInt(body.stock, 'stock') : 0;
    const rating = body.rating !== undefined ? requireNonNegNumber(body.rating, 'rating') : 5;
    const reviewCount = body.reviewCount !== undefined ? requireNonNegInt(body.reviewCount, 'reviewCount') : 0;
    const badge = optionalEnum(body.badge, BADGE_VALUES, 'badge');
    const originalPrice = body.originalPrice !== undefined && body.originalPrice !== null
      ? requireNonNegNumber(body.originalPrice, 'originalPrice') : null;
    const nameEn = optionalString(body.nameEn, 'nameEn', 255);
    const nameKey = optionalString(body.nameKey, 'nameKey', 100);
    const description = optionalString(body.description, 'description', 5000);
    const origin = optionalString(body.origin, 'origin', 255);
    const images = ensureStringArray(body.images, 'images');
    const tags = ensureStringArray(body.tags, 'tags');

    const id = String(Date.now());
    const result = await pool.query<ProductRow>(
      `INSERT INTO products (id, name_vi, name_en, name_key, price, original_price, image, images, category, unit, stock, description, origin, rating, review_count, badge, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb) RETURNING *`,
      [
        id, nameVi, nameEn ?? null, nameKey ?? null, price, originalPrice,
        image, images ? JSON.stringify(images) : null,
        category, unit, stock, description ?? null, origin ?? null,
        rating, reviewCount, badge ?? null,
        tags ? JSON.stringify(tags) : null,
      ]
    );
    res.status(201).json(mapProduct(result.rows[0]));
  })
);

router.put(
  "/:id",
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const existing = await pool.query<{ id: string }>(
      "SELECT id FROM products WHERE id = $1",
      [req.params.id]
    );
    if (existing.rows.length === 0) throw notFound("Product not found");

    const body = (req.body ?? {}) as Partial<Product>;
    const fields: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown) => {
      vals.push(val);
      fields.push(`${col} = $${vals.length}`);
    };

    if (body.nameVi !== undefined || body.name !== undefined) {
      push("name_vi", requireString(body.nameVi ?? body.name, 'name', 255));
    }
    if (body.nameEn !== undefined) push("name_en", optionalString(body.nameEn, 'nameEn', 255) ?? null);
    if (body.nameKey !== undefined) push("name_key", optionalString(body.nameKey, 'nameKey', 100) ?? null);
    if (body.price !== undefined) push("price", requireNonNegNumber(body.price, 'price'));
    if (body.originalPrice !== undefined) {
      push("original_price", body.originalPrice === null ? null : requireNonNegNumber(body.originalPrice, 'originalPrice'));
    }
    if (body.image !== undefined) push("image", requireString(body.image, 'image', 500));
    if (body.images !== undefined) {
      const imgs = ensureStringArray(body.images, 'images');
      push("images", imgs ? JSON.stringify(imgs) : null);
    }
    if (body.category !== undefined) push("category", requireString(body.category, 'category', 100));
    if (body.unit !== undefined) push("unit", requireString(body.unit, 'unit', 50));
    if (body.stock !== undefined) push("stock", requireNonNegInt(body.stock, 'stock'));
    if (body.description !== undefined) push("description", optionalString(body.description, 'description', 5000) ?? null);
    if (body.origin !== undefined) push("origin", optionalString(body.origin, 'origin', 255) ?? null);
    if (body.badge !== undefined) push("badge", optionalEnum(body.badge, BADGE_VALUES, 'badge') ?? null);
    if (body.tags !== undefined) {
      const tg = ensureStringArray(body.tags, 'tags');
      push("tags", tg ? JSON.stringify(tg) : null);
    }

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
  })
);

router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const existing = await pool.query<{ id: string }>(
      "SELECT id FROM products WHERE id = $1",
      [req.params.id]
    );
    if (existing.rows.length === 0) throw notFound("Product not found");
    await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    res.status(204).send();
  })
);

function validateProductInput(body: Partial<Product>, idx?: number): {
  nameVi: string; nameEn: string | null; nameKey: string | null;
  price: number; originalPrice: number | null; image: string;
  images: string[] | null; category: string; unit: string; stock: number;
  description: string | null; origin: string | null; rating: number;
  reviewCount: number; badge: 'new' | 'sale' | 'hot' | null; tags: string[] | null;
} {
  const prefix = idx !== undefined ? `items[${idx}].` : '';
  return {
    nameVi: requireString(body.nameVi ?? body.name, `${prefix}name`, 255),
    nameEn: optionalString(body.nameEn, `${prefix}nameEn`, 255) ?? null,
    nameKey: optionalString(body.nameKey, `${prefix}nameKey`, 100) ?? null,
    price: requireNonNegNumber(body.price, `${prefix}price`),
    originalPrice: body.originalPrice !== undefined && body.originalPrice !== null
      ? requireNonNegNumber(body.originalPrice, `${prefix}originalPrice`) : null,
    image: requireString(body.image, `${prefix}image`, 500),
    images: ensureStringArray(body.images, `${prefix}images`) ?? null,
    category: requireString(body.category, `${prefix}category`, 100),
    unit: requireString(body.unit, `${prefix}unit`, 50),
    stock: body.stock !== undefined ? requireNonNegInt(body.stock, `${prefix}stock`) : 0,
    description: optionalString(body.description, `${prefix}description`, 5000) ?? null,
    origin: optionalString(body.origin, `${prefix}origin`, 255) ?? null,
    rating: body.rating !== undefined ? requireNonNegNumber(body.rating, `${prefix}rating`) : 5,
    reviewCount: body.reviewCount !== undefined ? requireNonNegInt(body.reviewCount, `${prefix}reviewCount`) : 0,
    badge: optionalEnum(body.badge, BADGE_VALUES, `${prefix}badge`) ?? null,
    tags: ensureStringArray(body.tags, `${prefix}tags`) ?? null,
  };
}

router.post(
  "/bulk",
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'items must be a non-empty array' });
      return;
    }
    if (items.length > 1000) {
      res.status(400).json({ message: 'Max 1000 items per bulk request' });
      return;
    }
    const validated = items.map((it, i) => validateProductInput(it as Partial<Product>, i));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const created: Product[] = [];
      const now = Date.now();
      for (let i = 0; i < validated.length; i++) {
        const v = validated[i];
        const id = `${now}-${i}`;
        const r = await client.query<ProductRow>(
          `INSERT INTO products (id, name_vi, name_en, name_key, price, original_price, image, images, category, unit, stock, description, origin, rating, review_count, badge, tags)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb) RETURNING *`,
          [
            id, v.nameVi, v.nameEn, v.nameKey, v.price, v.originalPrice,
            v.image, v.images ? JSON.stringify(v.images) : null,
            v.category, v.unit, v.stock, v.description, v.origin,
            v.rating, v.reviewCount, v.badge,
            v.tags ? JSON.stringify(v.tags) : null,
          ]
        );
        created.push(mapProduct(r.rows[0]));
      }
      await client.query('COMMIT');
      res.status(201).json({ created: created.length, data: created });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

router.post(
  "/bulk-delete",
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'ids must be a non-empty array' });
      return;
    }
    if (!ids.every((id) => typeof id === 'string')) {
      res.status(400).json({ message: 'ids must contain strings only' });
      return;
    }
    if (ids.length > 1000) {
      res.status(400).json({ message: 'Max 1000 ids per request' });
      return;
    }
    const result = await pool.query('DELETE FROM products WHERE id = ANY($1::text[])', [ids]);
    res.json({ deleted: result.rowCount ?? 0 });
  })
);

export default router;
