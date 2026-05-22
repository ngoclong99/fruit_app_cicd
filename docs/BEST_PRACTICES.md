# Best Practices — Backend / Frontend / Mobile

> **Đối tượng:** Project học fullstack (React + Node.js + PostgreSQL + React Native).
> **Mục tiêu:** Chuyển từ "MVP works" sang "production-ready, mở rộng được". Tài liệu này là **single source of truth** cho cách tổ chức code, đặt tên, layering, security, testing.
> **Phong cách:** Pragmatic — chỉ giới thiệu pattern khi nó giải quyết vấn đề thực tế, không over-engineer.

---

## Mục lục

1. [Nguyên tắc chung (cross-cutting)](#1-nguyên-tắc-chung-cross-cutting)
2. [Backend (Node.js + Express + PostgreSQL)](#2-backend-nodejs--express--postgresql)
3. [Frontend (React + Vite + Redux Toolkit)](#3-frontend-react--vite--redux-toolkit)
4. [Mobile (React Native + Expo)](#4-mobile-react-native--expo)
5. [Validation chung — zod schemas dùng chung 3 apps](#5-validation-chung--zod-schemas-dùng-chung-3-apps)
6. [Testing](#6-testing)
7. [Security checklist](#7-security-checklist)
8. [Performance checklist](#8-performance-checklist)
9. [Migration roadmap từ current state](#9-migration-roadmap-từ-current-state)
10. [Anti-patterns thường gặp](#10-anti-patterns-thường-gặp)

---

## 1. Nguyên tắc chung (cross-cutting)

### 1.1 Layered architecture
Mọi app đều có 3 layer rõ ràng:

```
┌─────────────────────────────────────────────────────────┐
│ Presentation Layer                                       │
│   • HTTP routes / React components / RN screens          │
│   • Parse input → gọi service → format response          │
│   • KHÔNG chứa business logic, KHÔNG chứa SQL            │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│ Business Logic Layer (Services / Custom Hooks)           │
│   • Validation rules, business rules                     │
│   • Orchestrate calls to repository / API                │
│   • Pure logic, dễ unit test                             │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│ Data Access Layer (Repositories / API client)            │
│   • SQL queries / HTTP calls                             │
│   • Trả về typed data, KHÔNG biết về business rules      │
└─────────────────────────────────────────────────────────┘
```

**Quy tắc vàng:** mỗi layer chỉ gọi xuống layer dưới, KHÔNG gọi lên hoặc cross.

### 1.2 Folder organization — by-feature vs by-type

| | By-type (cũ) | By-feature (best practice) |
|---|---|---|
| **Setup** | `components/`, `hooks/`, `api/` | `features/products/`, `features/auth/` |
| **Khi thêm feature "vouchers"** | Đụng 4 folders | Tạo 1 folder `features/vouchers/` |
| **Khi xoá feature** | Lần mò 4 folders | Xoá 1 folder |
| **Khi nào dùng** | < 5 features, app nhỏ | App > 5 features, team > 2 người |

**Pattern hybrid hợp lý:**
```
src/
├── features/        ← Mỗi feature self-contained
│   ├── products/
│   │   ├── api.ts
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/      (FE/Mobile)
│   │   ├── controllers/ (BE)
│   │   ├── services/    (BE)
│   │   └── repository/  (BE)
│   ├── auth/
│   └── cart/
│
├── shared/          ← Dùng chung nhiều features
│   ├── components/  (Button, Input, Card)
│   ├── hooks/       (useDebounce, useToggle)
│   ├── utils/       (formatCurrency, formatDate)
│   ├── api/         (axios client, interceptors)
│   └── types/       (User, Product — shared interfaces)
│
└── app/             ← Bootstrap: routing, store config, providers
```

### 1.3 Naming conventions

| Loại | Convention | Ví dụ |
|---|---|---|
| Folders | kebab-case | `user-profile/`, `order-history/` |
| Files (React component) | PascalCase | `Button.tsx`, `ProductCard.tsx` |
| Files (hooks/utils) | camelCase | `useAuth.ts`, `formatDate.ts` |
| Files (types/schemas) | camelCase + suffix | `product.types.ts`, `auth.schema.ts` |
| Component name | PascalCase | `function ProductCard() {}` |
| Hook name | camelCase + `use` prefix | `function useProducts() {}` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY = 3` |
| Env vars | SCREAMING_SNAKE | `DATABASE_URL`, `JWT_SECRET` |

### 1.4 TypeScript strict mode bắt buộc

```jsonc
// tsconfig.json — apply cho cả 3 apps
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,  // Index access trả T | undefined
    "exactOptionalPropertyTypes": true, // ?: T khác T | undefined
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**Lý do `noUncheckedIndexedAccess`:** `arr[0]` thực ra có thể `undefined` (nếu mảng rỗng). TypeScript mặc định không catch điều này → bug runtime.

### 1.5 Đặt tên branch + commit message

```
# Branch naming
feat/<topic>       — Tính năng mới
fix/<topic>        — Bug fix
refactor/<topic>   — Refactor không đổi behavior
docs/<topic>       — Chỉ docs
chore/<topic>      — Tooling, deps update

# Commit message — Conventional Commits
feat(auth): add JWT refresh token
fix(products): pagination off-by-one when category empty
refactor(orders): extract OrderService from route handler
docs(api): add OpenAPI spec
chore(deps): bump express to 5.2.1
```

---

## 2. Backend (Node.js + Express + PostgreSQL)

### 2.1 Cấu trúc thư mục đề xuất

```
backend/
├── src/
│   ├── app.ts                  ← Tạo Express app, KHÔNG listen
│   ├── server.ts               ← Listen port, graceful shutdown
│   ├── config/
│   │   ├── env.ts              ← Validate + export env vars
│   │   ├── db.ts               ← PG Pool instance
│   │   └── logger.ts           ← pino logger
│   ├── features/
│   │   ├── products/
│   │   │   ├── product.routes.ts       ← Express router
│   │   │   ├── product.controller.ts   ← Parse req → service → res
│   │   │   ├── product.service.ts      ← Business logic
│   │   │   ├── product.repository.ts   ← SQL queries
│   │   │   ├── product.schema.ts       ← zod schemas
│   │   │   ├── product.types.ts        ← TypeScript interfaces
│   │   │   └── __tests__/
│   │   │       ├── product.service.test.ts
│   │   │       └── product.controller.test.ts
│   │   ├── auth/
│   │   ├── orders/
│   │   └── users/
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── auth.ts                 ← JWT verify
│   │   │   ├── errorHandler.ts         ← Global error catcher
│   │   │   ├── requestLogger.ts        ← pino-http
│   │   │   ├── rateLimiter.ts          ← express-rate-limit
│   │   │   └── validateBody.ts         ← zod middleware
│   │   ├── errors/
│   │   │   ├── AppError.ts             ← Base custom error
│   │   │   ├── NotFoundError.ts
│   │   │   ├── ValidationError.ts
│   │   │   └── UnauthorizedError.ts
│   │   ├── utils/
│   │   │   ├── asyncHandler.ts         ← Wrap async controllers
│   │   │   └── hash.ts                 ← bcrypt wrapper
│   │   └── types/
│   │       └── express.d.ts            ← Augment Request type
│   └── db/
│       ├── migrations/                 ← Knex migrations
│       │   ├── 20240101000001_create_users.ts
│       │   └── 20240101000002_create_products.ts
│       └── seeds/
│           └── seed_dev.ts
├── tests/
│   └── setup.ts                        ← Jest setup
├── .env.example
├── knexfile.ts
├── jest.config.ts
├── eslint.config.js
├── package.json
└── tsconfig.json
```

### 2.2 Layering pattern — Controller / Service / Repository

#### Anti-pattern (hiện tại): tất cả ở 1 file
```ts
// ❌ routes/products.ts — 370 dòng
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { nameVi, price, ... } = req.body;
  if (!nameVi) throw new Error('Name required');
  if (price < 0) throw new Error('Price invalid');
  // ... 50 dòng validation
  const result = await pool.query(
    'INSERT INTO products ... RETURNING *',
    [nameVi, price, ...]
  );
  res.json(result.rows[0]);
}));
```

Vấn đề:
- KHÔNG test được logic riêng (phải mock req/res)
- Copy-paste validation sang routes khác
- Đụng vào DB → khó migrate sang ORM

#### Best practice: 3 layers riêng

**Layer 1 — Repository** (DB access only):
```ts
// features/products/product.repository.ts
import { pool } from '@/config/db';
import type { Product, CreateProductInput } from './product.types';

export const productRepository = {
  async findById(id: number): Promise<Product | null> {
    const { rows } = await pool.query<Product>(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  },

  async findMany(filter: { categoryId?: number; limit: number; offset: number }): Promise<Product[]> {
    const { rows } = await pool.query<Product>(
      `SELECT * FROM products
       WHERE ($1::int IS NULL OR category_id = $1)
       ORDER BY id DESC
       LIMIT $2 OFFSET $3`,
      [filter.categoryId ?? null, filter.limit, filter.offset]
    );
    return rows;
  },

  async create(input: CreateProductInput): Promise<Product> {
    const { rows } = await pool.query<Product>(
      `INSERT INTO products (name_vi, price, category_id, ...)
       VALUES ($1, $2, $3, ...)
       RETURNING *`,
      [input.nameVi, input.price, input.categoryId, ...]
    );
    return rows[0];
  },

  async update(id: number, input: Partial<CreateProductInput>): Promise<Product | null> {
    // ... dynamic UPDATE
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};
```

**Layer 2 — Service** (business logic):
```ts
// features/products/product.service.ts
import { productRepository } from './product.repository';
import { createProductSchema, type CreateProductInput } from './product.schema';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { logger } from '@/config/logger';

export const productService = {
  async getById(id: number) {
    const product = await productRepository.findById(id);
    if (!product) throw new NotFoundError(`Product ${id} not found`);
    return product;
  },

  async list(filter: { categoryId?: number; page: number; pageSize: number }) {
    const limit = Math.min(filter.pageSize, 100);  // Cap pagesize
    const offset = (filter.page - 1) * limit;
    return productRepository.findMany({ ...filter, limit, offset });
  },

  async create(input: unknown) {
    // zod validation — throw ValidationError nếu sai
    const parsed = createProductSchema.parse(input);
    
    // Business rule: ngăn duplicate
    const existing = await productRepository.findByName(parsed.nameVi);
    if (existing) throw new ValidationError('Product name already exists');
    
    const product = await productRepository.create(parsed);
    logger.info({ productId: product.id }, 'Product created');
    return product;
  },
};
```

**Layer 3 — Controller** (HTTP only):
```ts
// features/products/product.controller.ts
import type { Request, Response } from 'express';
import { productService } from './product.service';

export const productController = {
  async getById(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const product = await productService.getById(id);
    res.json(product);
  },

  async list(req: Request, res: Response) {
    const products = await productService.list({
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
    });
    res.json({ data: products });
  },

  async create(req: Request, res: Response) {
    const product = await productService.create(req.body);
    res.status(201).json(product);
  },
};
```

**Routes** (chỉ wiring):
```ts
// features/products/product.routes.ts
import { Router } from 'express';
import { productController } from './product.controller';
import { authenticate, requireAdmin } from '@/shared/middleware/auth';
import { asyncHandler } from '@/shared/utils/asyncHandler';

const router = Router();

router.get('/',     asyncHandler(productController.list));
router.get('/:id',  asyncHandler(productController.getById));
router.post('/',    authenticate, requireAdmin, asyncHandler(productController.create));
router.put('/:id',  authenticate, requireAdmin, asyncHandler(productController.update));
router.delete('/:id', authenticate, requireAdmin, asyncHandler(productController.delete));

export default router;
```

**Lợi ích:**
- ✅ Test `product.service.test.ts` không cần Express
- ✅ Test `product.repository.test.ts` với DB thật (integration test)
- ✅ Controller chỉ 30 dòng, dễ đọc
- ✅ Swap DB sang Prisma chỉ đụng repository

### 2.3 Error handling — class-based

```ts
// shared/errors/AppError.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// shared/errors/NotFoundError.ts
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

// shared/errors/ValidationError.ts
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

// shared/errors/UnauthorizedError.ts
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// shared/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@/shared/errors/AppError';
import { ZodError } from 'zod';
import { logger } from '@/config/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details: err.errors,
    });
  }
  
  // Custom AppError subclasses
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }
  
  // Unknown error — log + generic response
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Something went wrong',
  });
}
```

### 2.4 Logger — pino structured

```ts
// config/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV === 'production'
    ? undefined  // JSON to stdout — CloudWatch/Loki parse được
    : { target: 'pino-pretty' },  // Dev: human-readable
  redact: ['req.headers.authorization', 'req.body.password'],  // KHÔNG log sensitive
});

// shared/middleware/requestLogger.ts
import pinoHttp from 'pino-http';
import { logger } from '@/config/logger';

export const requestLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, id: req.id }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
```

**Tại sao pino > console.log:**
- Structured JSON → parse được trong log aggregator (CloudWatch, Loki, Datadog)
- 10x nhanh hơn winston (production-critical)
- Có redact tự động — không lộ password/token trong log
- Levels (debug/info/warn/error) — filter trong production

### 2.5 Rate limiting + Security headers

```ts
// app.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet());  // Set security headers (CSP, X-Frame-Options, ...)

// Global rate limit: 100 req/15 phút per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Stricter rate limit for auth endpoints (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,  // 5 attempts per 15 phút
  skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

### 2.6 Database migrations — Knex

```ts
// knexfile.ts
import type { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: { directory: './src/db/migrations', extension: 'ts' },
    seeds: { directory: './src/db/seeds' },
  },
  production: {
    client: 'pg',
    connection: { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } },
    migrations: { directory: './src/db/migrations', extension: 'ts' },
  },
};

export default config;
```

```ts
// src/db/migrations/20240101000001_create_users.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.string('name').notNullable();
    table.enum('role', ['user', 'admin']).defaultTo('user').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
}
```

**Workflow:**
```bash
npx knex migrate:make create_orders   # Create new migration file
npx knex migrate:latest                # Run all pending
npx knex migrate:rollback              # Undo last
```

**Tại sao thay `init.sql`:**
- Mỗi schema change = 1 migration file → diff được trong git
- Rollback an toàn (`down` function)
- Production team có thể chạy migrations với `knex migrate:latest` mà không restart container
- Knex tự track table `knex_migrations` để biết migration nào đã chạy

### 2.7 Express setup tách app vs server

```ts
// app.ts — KHÔNG listen, dùng được trong test
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from '@/shared/middleware/errorHandler';
import { requestLogger } from '@/shared/middleware/requestLogger';
import productRoutes from '@/features/products/product.routes';
// ...

export function createApp() {
  const app = express();
  
  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN }));
  app.use(express.json({ limit: '5mb' }));
  app.use(requestLogger);
  
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  
  app.use(errorHandler);  // Phải LAST
  
  return app;
}

// server.ts
import { createApp } from './app';
import { logger } from '@/config/logger';

const app = createApp();
const port = Number(process.env.PORT ?? 5000);

const server = app.listen(port, () => {
  logger.info(`Listening on :${port}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

Test:
```ts
// __tests__/products.test.ts
import request from 'supertest';
import { createApp } from '@/app';

const app = createApp();

test('GET /api/products returns list', async () => {
  const res = await request(app).get('/api/products');
  expect(res.status).toBe(200);
  expect(res.body.data).toBeInstanceOf(Array);
});
```

### 2.8 Environment variables — validate với zod

```ts
// config/env.ts
import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('❌ Invalid env variables:', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
```

Khi import: `import { env } from '@/config/env';` — type-safe, fail-fast khi thiếu env.

---

## 3. Frontend (React + Vite + Redux Toolkit)

### 3.1 Cấu trúc thư mục đề xuất

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── app/
│   │   ├── router.tsx              ← Centralized routes
│   │   ├── store.ts                ← Redux store config
│   │   └── providers.tsx           ← QueryClient, Theme, i18n
│   ├── features/
│   │   ├── products/
│   │   │   ├── api/
│   │   │   │   ├── productsApi.ts          ← RTK Query slice (or axios calls)
│   │   │   │   └── product.schema.ts       ← zod (validate response)
│   │   │   ├── components/
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── ProductList.tsx
│   │   │   │   └── ProductFilters.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useProducts.ts
│   │   │   │   └── useProductFilters.ts
│   │   │   ├── pages/
│   │   │   │   ├── ProductsPage.tsx
│   │   │   │   └── ProductDetailPage.tsx
│   │   │   └── types.ts
│   │   ├── auth/
│   │   ├── cart/
│   │   ├── orders/
│   │   └── admin/
│   ├── shared/
│   │   ├── components/ui/          ← Design system primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Badge.tsx
│   │   ├── components/layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   └── useMediaQuery.ts
│   │   ├── api/
│   │   │   ├── axios.ts            ← Base axios instance + interceptors
│   │   │   └── client.ts           ← Wrapper với error handling
│   │   ├── utils/
│   │   │   ├── formatCurrency.ts
│   │   │   ├── formatDate.ts
│   │   │   └── cn.ts               ← Tailwind className merge
│   │   ├── types/
│   │   │   └── api.types.ts        ← ApiError, ApiResponse, ...
│   │   └── i18n/
│   ├── styles/
│   │   ├── globals.css
│   │   └── tailwind.config.ts
│   └── assets/
├── tests/
│   └── setup.ts
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

### 3.2 Design system — UI primitives

**Vấn đề hiện tại:** mỗi form viết `<input className="border rounded px-3 py-2 ...">` riêng → không consistent.

**Best practice:** UI primitives reusable.

```tsx
// shared/components/ui/Button.tsx
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
  ghost:     'bg-transparent hover:bg-gray-100 text-gray-700',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, leftIcon, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {isLoading ? <Spinner size="sm" /> : leftIcon}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
```

**Sử dụng:**
```tsx
<Button variant="primary" size="lg" isLoading={loading} onClick={handleSubmit}>
  Save
</Button>
```

**Lợi ích:** đổi color scheme chỉ sửa 1 file. Tất cả Button trong app đổi theo.

### 3.3 Forms — react-hook-form + zod

**Anti-pattern (hiện tại):**
```tsx
// ❌ Manual setState + manual validation
const [email, setEmail] = useState('');
const [emailError, setEmailError] = useState('');
const [password, setPassword] = useState('');
const [passwordError, setPasswordError] = useState('');

const handleSubmit = (e) => {
  e.preventDefault();
  if (!email.includes('@')) { setEmailError('Invalid email'); return; }
  if (password.length < 6) { setPasswordError('Min 6 chars'); return; }
  // ... 30 dòng nữa
};
```

**Best practice:**
```ts
// features/auth/schemas/login.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

```tsx
// features/auth/components/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '../schemas/login.schema';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

export function LoginForm({ onSubmit }: { onSubmit: (data: LoginInput) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email"
        type="email"
        {...register('email')}
        error={errors.email?.message}
      />
      <Input
        label="Password"
        type="password"
        {...register('password')}
        error={errors.password?.message}
      />
      <Button type="submit" isLoading={isSubmitting}>Đăng nhập</Button>
    </form>
  );
}
```

**Lợi ích:**
- Code 30 dòng thay 100 dòng
- Type-safe — `data` trong onSubmit có type `LoginInput`
- Schema chia sẻ với BE (validate giống nhau)
- Validation runtime đầy đủ

### 3.4 Data fetching — RTK Query

**Anti-pattern (hiện tại):**
```tsx
// ❌ Mỗi component tự fetch + manage loading/error
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(false);
useEffect(() => {
  setLoading(true);
  axios.get('/api/products').then(r => setProducts(r.data)).finally(() => setLoading(false));
}, []);
```

**Best practice:**
```ts
// features/products/api/productsApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Product, ProductFilter } from '../types';

export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api`,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Product'],
  endpoints: (builder) => ({
    listProducts: builder.query<{ data: Product[]; total: number }, ProductFilter>({
      query: (filter) => ({ url: '/products', params: filter }),
      providesTags: (result) =>
        result
          ? [...result.data.map(({ id }) => ({ type: 'Product' as const, id })), { type: 'Product', id: 'LIST' }]
          : [{ type: 'Product', id: 'LIST' }],
    }),
    getProduct: builder.query<Product, number>({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Product', id }],
    }),
    createProduct: builder.mutation<Product, CreateProductInput>({
      query: (body) => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),
  }),
});

export const { useListProductsQuery, useGetProductQuery, useCreateProductMutation } = productsApi;
```

**Sử dụng:**
```tsx
export function ProductsPage() {
  const { data, isLoading, error } = useListProductsQuery({ page: 1, pageSize: 20 });
  
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      {data?.data.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
```

**Lợi ích:**
- Built-in: loading, error, refetch, cache, dedup
- Tag-based invalidation: tạo product → list tự refetch
- Type-safe end-to-end
- Code component ngắn 80%

### 3.5 Custom hooks — extract logic khỏi pages

```ts
// features/products/hooks/useProductFilters.ts
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface Filters {
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'price' | 'name' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filters = useMemo<Filters>(() => ({
    categoryId: searchParams.get('category') ? Number(searchParams.get('category')) : undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    search: searchParams.get('q') ?? undefined,
    sortBy: (searchParams.get('sortBy') as Filters['sortBy']) ?? 'createdAt',
    sortDir: (searchParams.get('sortDir') as Filters['sortDir']) ?? 'desc',
  }), [searchParams]);
  
  const setFilter = (key: keyof Filters, value: string | number | undefined) => {
    setSearchParams((prev) => {
      if (value === undefined || value === '') prev.delete(key);
      else prev.set(key, String(value));
      return prev;
    });
  };
  
  const reset = () => setSearchParams({});
  
  return { filters, setFilter, reset };
}
```

**Sử dụng:**
```tsx
function ProductsPage() {
  const { filters, setFilter, reset } = useProductFilters();
  const { data } = useListProductsQuery(filters);
  
  return (
    <>
      <select value={filters.categoryId ?? ''} onChange={(e) => setFilter('categoryId', Number(e.target.value))}>
        {/* ... */}
      </select>
      <ProductList products={data?.data} />
    </>
  );
}
```

**Hooks rule:**
- Mỗi hook = 1 concern (filters, pagination, sorting, ...)
- Hook KHÔNG đụng đến UI rendering — chỉ trả về state + setters
- Test riêng được với `renderHook` từ `@testing-library/react`

### 3.6 Routing — Lazy load + Code splitting

```tsx
// app/router.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from '@/shared/components/layout/Layout';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { Spinner } from '@/shared/components/ui/Spinner';

const HomePage      = lazy(() => import('@/features/home/pages/HomePage'));
const ProductsPage  = lazy(() => import('@/features/products/pages/ProductsPage'));
const ProductDetail = lazy(() => import('@/features/products/pages/ProductDetailPage'));
const CartPage      = lazy(() => import('@/features/cart/pages/CartPage'));
const CheckoutPage  = lazy(() => import('@/features/orders/pages/CheckoutPage'));
const AdminLayout   = lazy(() => import('@/features/admin/components/AdminLayout'));
const AdminProducts = lazy(() => import('@/features/admin/pages/AdminProducts'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/:id', element: <ProductDetail /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <ProtectedRoute><CheckoutPage /></ProtectedRoute> },
      {
        path: 'admin',
        element: <ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>,
        children: [
          { path: 'products', element: <AdminProducts /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

export function AppRouter() {
  return (
    <Suspense fallback={<Spinner fullScreen />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
```

### 3.7 Vite config best practices

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          charts: ['recharts'],
        },
      },
    },
  },
});
```

`manualChunks` giúp:
- Vendor code (react, redux) cache lâu (ít đổi)
- App code chunk riêng (đổi mỗi deploy)
- User load lại app không phải re-download react

---

## 4. Mobile (React Native + Expo)

### 4.1 Cấu trúc thư mục đề xuất

```
mobile/
├── App.tsx                       ← Bootstrap providers + AppRouter
├── src/
│   ├── app/
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx     ← Quyết định Auth vs Main
│   │   │   ├── AuthStack.tsx         ← Login, Register, ForgotPassword
│   │   │   ├── MainTabs.tsx          ← Bottom tabs (Home, Products, Cart, Profile)
│   │   │   ├── HomeStack.tsx         ← Stack trong Home tab
│   │   │   ├── ProductsStack.tsx
│   │   │   ├── linking.ts            ← Deep linking config
│   │   │   └── types.ts              ← ParamLists
│   │   └── providers/
│   │       ├── AppProviders.tsx      ← Compose AuthProvider, QueryProvider, ThemeProvider
│   │       └── QueryProvider.tsx     ← React Query setup
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api/auth.api.ts
│   │   │   ├── components/LoginForm.tsx
│   │   │   ├── hooks/useAuth.ts
│   │   │   ├── screens/LoginScreen.tsx
│   │   │   ├── screens/RegisterScreen.tsx
│   │   │   └── store/AuthContext.tsx
│   │   ├── products/
│   │   ├── cart/
│   │   └── orders/
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── ErrorScreen.tsx
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   └── useAsyncStorage.ts
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   └── tokenStorage.ts
│   │   ├── theme/
│   │   │   ├── colors.ts
│   │   │   ├── spacing.ts
│   │   │   ├── typography.ts
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── format.ts
│   │       └── platform.ts
│   └── types/
│       └── api.types.ts
├── assets/
├── app.json
├── eas.json                      ← EAS Build config
├── babel.config.js
└── tsconfig.json
```

### 4.2 Navigation — Auth stack split

**Anti-pattern (hiện tại):** Login screen + Tabs cùng 1 stack → khi logout phải `navigate('Login')` không reset stack → back button có thể quay lại Tabs (lỗi UX).

**Best practice:**
```tsx
// app/navigation/RootNavigator.tsx
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { SplashScreen } from '@/shared/components/SplashScreen';

export function RootNavigator() {
  const { user, loading } = useAuth();
  
  if (loading) return <SplashScreen />;
  
  // Switch stack root → tự động reset history, không cần navigate
  return user ? <MainTabs /> : <AuthStack />;
}
```

```tsx
// app/navigation/AuthStack.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { RegisterScreen } from '@/features/auth/screens/RegisterScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
```

```tsx
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { AppProviders } from '@/app/providers/AppProviders';
import { RootNavigator } from '@/app/navigation/RootNavigator';
import { linking } from '@/app/navigation/linking';

export default function App() {
  return (
    <AppProviders>
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>
  );
}
```

**Khi logout** trong AuthContext:
```ts
async function logout() {
  await tokenStorage.clear();
  setUser(null);
  // KHÔNG navigate — RootNavigator tự switch sang AuthStack vì user = null
}
```

### 4.3 Theme tokens

**Anti-pattern:**
```tsx
// ❌ Magic numbers khắp nơi
<View style={{ padding: 12, marginBottom: 16, borderRadius: 8 }}>
  <Text style={{ fontSize: 18, fontWeight: '700' }}>Title</Text>
</View>
```

**Best practice:**
```ts
// shared/theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export type SpacingKey = keyof typeof spacing;

// shared/theme/typography.ts
import { TextStyle } from 'react-native';

export const typography = {
  h1:   { fontSize: 28, fontWeight: '800', lineHeight: 36 } satisfies TextStyle,
  h2:   { fontSize: 22, fontWeight: '700', lineHeight: 30 } satisfies TextStyle,
  h3:   { fontSize: 18, fontWeight: '700', lineHeight: 26 } satisfies TextStyle,
  body: { fontSize: 14, fontWeight: '400', lineHeight: 22 } satisfies TextStyle,
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 18, color: '#666' } satisfies TextStyle,
} as const;

// shared/theme/colors.ts
export const colors = {
  // Brand
  primary: '#10B981',
  primaryDark: '#059669',
  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  // Neutral
  text: '#111827',
  textSecondary: '#6B7280',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  border: '#E5E7EB',
} as const;

// shared/theme/index.ts
export * from './spacing';
export * from './typography';
export * from './colors';
```

**Sử dụng:**
```tsx
import { spacing, typography, colors } from '@/shared/theme';

<View style={{ padding: spacing.md, marginBottom: spacing.lg, borderRadius: 8 }}>
  <Text style={[typography.h3, { color: colors.text }]}>Title</Text>
</View>
```

### 4.4 Error Boundary + Error UI

```tsx
// shared/components/ErrorBoundary.tsx
import React from 'react';
import { ErrorScreen } from './ErrorScreen';

interface State { error: Error | null; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };
  
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // TODO: Sentry.captureException(error, { extra: info });
    console.error('ErrorBoundary caught:', error, info);
  }
  
  reset = () => this.setState({ error: null });
  
  render() {
    if (this.state.error) {
      return <ErrorScreen error={this.state.error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
```

```tsx
// App.tsx
<ErrorBoundary>
  <AppProviders>
    {/* ... */}
  </AppProviders>
</ErrorBoundary>
```

### 4.5 Persistent storage abstraction

**Anti-pattern:** `AsyncStorage.getItem('user')` rải rác.

**Best practice:**
```ts
// shared/api/tokenStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@app/auth_token';
const USER_KEY = '@app/user';

export const tokenStorage = {
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  },
};
```

```ts
// shared/api/client.ts
import axios from 'axios';
import Constants from 'expo-constants';
import { tokenStorage } from './tokenStorage';

const api = axios.create({
  baseURL: Constants.expoConfig?.extra?.apiUrl as string,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await tokenStorage.clear();
      // RootNavigator sẽ tự switch sang AuthStack vì user state change
    }
    return Promise.reject(err);
  }
);

export { api };
```

### 4.6 Custom hooks cho screens

**Anti-pattern:** ProductsScreen 500+ dòng — fetch + filter + sort + UI.

**Best practice:**
```ts
// features/products/hooks/useProducts.ts
import { useEffect, useState } from 'react';
import { productsApi } from '../api/products.api';
import type { Product, ProductFilter } from '../types';

interface State {
  products: Product[];
  loading: boolean;
  error: string | null;
}

export function useProducts(filter: ProductFilter) {
  const [state, setState] = useState<State>({ products: [], loading: true, error: null });
  
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    
    productsApi.list(filter)
      .then((data) => { if (!cancelled) setState({ products: data, loading: false, error: null }); })
      .catch((err) => { if (!cancelled) setState({ products: [], loading: false, error: err.message }); });
    
    return () => { cancelled = true; };
  }, [JSON.stringify(filter)]);  // Re-fetch khi filter đổi
  
  return state;
}
```

Screen ngắn lại:
```tsx
export function ProductsScreen() {
  const { filter, setFilter } = useProductFilters();
  const { products, loading, error } = useProducts(filter);
  
  if (loading) return <Spinner />;
  if (error) return <EmptyState title="Lỗi" message={error} onRetry={...} />;
  
  return <FlatList data={products} renderItem={({ item }) => <ProductCard product={item} />} />;
}
```

### 4.7 EAS Build config

```jsonc
// eas.json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "API_URL": "http://10.0.2.2:5000"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": {
        "API_URL": "https://api-staging.example.com"
      }
    },
    "production": {
      "android": { "buildType": "aab" },
      "env": {
        "API_URL": "https://api.example.com"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 5. Validation chung — zod schemas dùng chung 3 apps

Đây là pattern **mạnh nhất**: 1 schema dùng 3 nơi (BE, FE, Mobile).

### Setup
```
shared-schemas/                   ← Tạo monorepo workspace hoặc git submodule
├── package.json
└── src/
    ├── auth.schema.ts
    ├── product.schema.ts
    └── order.schema.ts
```

Hoặc đơn giản: copy schemas giữa 3 apps (acceptable cho project nhỏ).

```ts
// shared-schemas/src/product.schema.ts
import { z } from 'zod';

export const productSchema = z.object({
  id: z.number().int().positive(),
  nameVi: z.string().min(1).max(255),
  nameEn: z.string().max(255).optional(),
  price: z.number().nonnegative(),
  categoryId: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
  description: z.string().max(2000).optional(),
  createdAt: z.string().datetime(),
});

export const createProductSchema = productSchema.omit({ id: true, createdAt: true });
export const updateProductSchema = createProductSchema.partial();

export type Product = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
```

**Backend** (validate input):
```ts
import { createProductSchema } from '@shared/product.schema';

const parsed = createProductSchema.parse(req.body);
// parsed có type CreateProductInput — type-safe ngay
```

**Frontend** (validate form):
```tsx
import { createProductSchema, type CreateProductInput } from '@shared/product.schema';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit } = useForm<CreateProductInput>({
  resolver: zodResolver(createProductSchema),
});
```

**Mobile** (validate form):
```tsx
// Same as frontend
```

**Lợi ích:**
- Single source of truth — validation rule chỉ định nghĩa 1 lần
- FE biết chính xác BE expect gì
- Đổi rule → đổi 1 file → cả 3 apps update

---

## 6. Testing

### 6.1 Test pyramid

```
       /\
      /E2\        ← Playwright/Cypress (FE) — vài tests
     /----\
    / Int. \     ← Integration tests (BE: API + DB) — vừa phải
   /--------\
  /  Unit    \   ← Pure logic, no IO — nhiều nhất
 /------------\
```

### 6.2 Backend testing

**Unit test — service layer:**
```ts
// features/products/__tests__/product.service.test.ts
import { productService } from '../product.service';
import { productRepository } from '../product.repository';
import { NotFoundError } from '@/shared/errors';

jest.mock('../product.repository');
const mockRepo = productRepository as jest.Mocked<typeof productRepository>;

describe('productService.getById', () => {
  it('returns product when found', async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, nameVi: 'Apple', price: 10 } as any);
    const result = await productService.getById(1);
    expect(result.nameVi).toBe('Apple');
  });
  
  it('throws NotFoundError when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(productService.getById(999)).rejects.toThrow(NotFoundError);
  });
});
```

**Integration test — HTTP layer:**
```ts
// features/products/__tests__/product.integration.test.ts
import request from 'supertest';
import { createApp } from '@/app';

const app = createApp();

describe('GET /api/products', () => {
  it('returns 200 with product list', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});
```

### 6.3 Frontend testing

```ts
// features/products/__tests__/useProducts.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useProducts } from '../hooks/useProducts';
import { Provider } from 'react-redux';
import { setupStore } from '@/app/store';

const wrapper = ({ children }) => <Provider store={setupStore()}>{children}</Provider>;

test('useProducts loads data', async () => {
  const { result } = renderHook(() => useProducts({ page: 1 }), { wrapper });
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.products).toHaveLength(20);
});
```

### 6.4 Coverage target

| Layer | Target |
|---|---|
| Service (business logic) | 80%+ |
| Repository | 60%+ (integration tests) |
| Controller | 50%+ |
| Custom hooks | 70%+ |
| UI components | 30%+ (chỉ critical paths) |

Không cần 100% coverage — focus vào critical paths.

---

## 7. Security checklist

### Backend
- [ ] **Helmet** — security headers
- [ ] **CORS** — explicit origin, không `*`
- [ ] **Rate limiting** — global + stricter cho auth endpoints
- [ ] **Input validation** — zod ở mọi route
- [ ] **SQL injection** — luôn dùng parameterized queries (`$1, $2`), KHÔNG concatenate string
- [ ] **JWT_SECRET** — từ env, min 32 chars, KHÔNG có fallback hardcoded
- [ ] **Password hashing** — bcrypt với cost ≥ 10
- [ ] **Logger redact** — KHÔNG log Authorization header, password
- [ ] **HTTPS only** trong production
- [ ] **Error response** — không expose stack trace tới client
- [ ] **Dependencies** — `npm audit` định kỳ, dependabot

### Frontend
- [ ] **Content Security Policy** — meta tag hoặc HTTP header
- [ ] **XSS** — KHÔNG `dangerouslySetInnerHTML` với user input
- [ ] **Tokens** — localStorage OK với JWT (KHÔNG dùng với cookie-based)
- [ ] **API base URL** — từ env (`import.meta.env.VITE_API_URL`), không hardcode
- [ ] **Sensitive routes** — ProtectedRoute với check role
- [ ] **Form input** — validate client + server (defense in depth)

### Mobile
- [ ] **Token storage** — AsyncStorage OK cho JWT. SecureStore cho refresh token / sensitive data
- [ ] **Deep linking** — validate scheme, KHÔNG trust params từ link
- [ ] **API URL** — `app.json` extra, không hardcode
- [ ] **Certificate pinning** — production app nên có (axios-cert-pinning)
- [ ] **Permissions** — request on-demand, không request all at launch

---

## 8. Performance checklist

### Backend
- [ ] **DB indexes** — trên columns hay search/sort (email, created_at, foreign keys)
- [ ] **Connection pool** — pg Pool min/max config
- [ ] **N+1 queries** — dùng JOIN hoặc DataLoader pattern
- [ ] **Caching** — Redis cho hot endpoints (products list, categories)
- [ ] **Compression** — `compression` middleware
- [ ] **Gzip nginx** — gzip_types text/css application/javascript

### Frontend
- [ ] **Code splitting** — `React.lazy` mỗi route
- [ ] **Vite chunking** — manualChunks cho vendor code
- [ ] **Image optimization** — lazy load + WebP/AVIF + responsive srcset
- [ ] **Bundle analyzer** — `vite-bundle-visualizer` định kỳ
- [ ] **RTK Query cache** — tag-based invalidation
- [ ] **Memo expensive components** — `React.memo`, `useMemo`, `useCallback`
- [ ] **Virtualize long lists** — `react-window` cho list > 100 items

### Mobile
- [ ] **FlatList** thay ScrollView cho list dài
- [ ] **Image caching** — `expo-image` với memory-disk cache
- [ ] **Animations** — `react-native-reanimated` (runs trên UI thread)
- [ ] **Hermes engine** — bật trong app.json (default Expo 50+)
- [ ] **InteractionManager** — defer heavy work sau navigation
- [ ] **getItemLayout** trong FlatList — skip measurement

---

## 9. Migration roadmap từ current state

### Phase 1 — Quick wins (1-2 ngày)
- [ ] Backend: thêm `helmet`, `express-rate-limit`, `pino`
- [ ] Backend: validate env vars với zod
- [ ] Backend: tách `app.ts` vs `server.ts`
- [ ] All: setup ESLint + Prettier config nhất quán
- [ ] All: bật strict TypeScript hơn (`noUncheckedIndexedAccess`)

### Phase 2 — Validation layer (2-3 ngày)
- [ ] Tạo `shared-schemas` với zod schemas cho auth, products, orders
- [ ] Backend: thêm `validateBody(schema)` middleware
- [ ] Refactor 1 route (vd: products) sang Controller/Service/Repository
- [ ] Frontend: install `react-hook-form` + `zod`, refactor LoginForm
- [ ] Mobile: same pattern

### Phase 3 — UI primitives (2-3 ngày)
- [ ] Frontend: tạo `shared/components/ui/` — Button, Input, Card, Modal
- [ ] Mobile: same + theme tokens (spacing, typography)
- [ ] Refactor 2-3 forms / pages dùng UI primitives

### Phase 4 — Architecture (3-5 ngày)
- [ ] Backend: refactor toàn bộ routes sang feature-based
- [ ] Frontend: migrate to feature-based + RTK Query cho 1 feature
- [ ] Mobile: split AuthStack vs MainStack, add ErrorBoundary
- [ ] All: extract custom hooks từ pages/screens fat

### Phase 5 — Quality (5+ ngày)
- [ ] Setup Jest (BE), Vitest (FE), Jest+RTL (Mobile)
- [ ] Tests cho critical paths (auth, checkout, payment)
- [ ] Setup Knex + migrate `init.sql` → migrations
- [ ] Add Husky + lint-staged (pre-commit hooks)

---

## 10. Anti-patterns thường gặp

### Backend

```ts
// ❌ Direct DB call trong route
router.get('/users', async (req, res) => {
  const result = await pool.query('SELECT * FROM users');
  res.json(result.rows);
});

// ❌ Catch + log + return generic — mất stack trace
try { ... } catch (err) { console.log(err); res.status(500).json({ error: 'oops' }); }

// ❌ JWT_SECRET hardcoded
const token = jwt.sign({...}, process.env.JWT_SECRET ?? 'my-secret');

// ❌ Inline validation
if (!email || email.length < 5) return res.status(400).json({ error: 'bad' });

// ❌ Async without error handler
router.get('/products', async (req, res) => {
  const data = await fetchProducts();  // Nếu throw → app crash
  res.json(data);
});
```

### Frontend

```tsx
// ❌ Fetch trong useEffect không cancel
useEffect(() => {
  axios.get('/api/products').then(setProducts);
}, []);  // Memory leak nếu component unmount trước response

// ❌ useState cho derived value
const [filteredProducts, setFilteredProducts] = useState([]);
useEffect(() => {
  setFilteredProducts(products.filter(p => p.price > 0));
}, [products]);
// → Should be: const filtered = useMemo(() => products.filter(...), [products]);

// ❌ Inline object trong useEffect deps
useEffect(() => { ... }, [{ id: 1 }]);  // Re-run mỗi render

// ❌ Spread props vô tội vạ
<Input {...props} />  // Có thể leak unwanted attributes

// ❌ Conditional hook
if (user) { useEffect(...); }  // Vi phạm rules of hooks
```

### Mobile

```tsx
// ❌ ScrollView cho list dài
<ScrollView>{items.map(...)}</ScrollView>  // → Use FlatList

// ❌ Inline style với mỗi render
<View style={{ padding: 12 }}>  // → New object mỗi render, breaks memo

// ❌ Direct AsyncStorage trong screens
const token = await AsyncStorage.getItem('token');
// → Abstract sau tokenStorage

// ❌ Auth + Main cùng stack
<Stack.Navigator>
  <Stack.Screen name="Login" />
  <Stack.Screen name="Home" />
</Stack.Navigator>
// → Split AuthStack vs MainTabs ở RootNavigator

// ❌ Không handle keyboard
<TextInput />  // Trên iOS keyboard che TextInput
// → Wrap trong KeyboardAvoidingView
```

---

## Reference

### Recommended packages

#### Backend
```json
{
  "dependencies": {
    "express": "^5.0.0",
    "cors": "^2.8.5",
    "helmet": "^8.0.0",
    "express-rate-limit": "^7.4.0",
    "pino": "^9.5.0",
    "pino-http": "^10.3.0",
    "zod": "^3.23.0",
    "bcryptjs": "^3.0.0",
    "jsonwebtoken": "^9.0.0",
    "pg": "^8.13.0",
    "knex": "^3.1.0",
    "dotenv": "^17.0.0"
  },
  "devDependencies": {
    "pino-pretty": "^11.3.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0",
    "eslint": "^9.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "prettier": "^3.3.0"
  }
}
```

#### Frontend
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@reduxjs/toolkit": "^2.0.0",
    "react-redux": "^9.0.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.0",
    "axios": "^1.7.0",
    "i18next": "^26.0.0",
    "react-i18next": "^17.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.5.0",
    "jsdom": "^25.0.0"
  }
}
```

#### Mobile
```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "react-native": "0.74.0",
    "@react-navigation/native": "^6.0.0",
    "@react-navigation/native-stack": "^6.0.0",
    "@react-navigation/bottom-tabs": "^6.0.0",
    "@react-native-async-storage/async-storage": "^1.23.0",
    "expo-secure-store": "~13.0.0",
    "expo-image": "~1.13.0",
    "react-native-reanimated": "~3.10.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-expo": "~51.0.0",
    "@testing-library/react-native": "^12.7.0"
  }
}
```

### Useful links

- [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Express best practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [React docs](https://react.dev/learn)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [React Native](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
