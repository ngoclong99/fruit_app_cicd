# Fruit Shop — E-commerce (React + Express + PostgreSQL)

Ứng dụng bán trái cây dùng làm dự án học **AWS DevOps / CI-CD**. Gồm web (React),
backend REST API (Express + PostgreSQL) và app mobile (React Native / Expo).

## Cấu trúc

```
Deploy-1/
├── backend/         Express 5 + TypeScript + PostgreSQL (pg)
│   ├── src/
│   │   ├── index.ts                  bootstrap app + middleware
│   │   ├── db.ts                     PostgreSQL pool
│   │   ├── config/                   env (zod) + logger (pino)
│   │   ├── middleware/               auth (JWT) + error handler
│   │   ├── features/auth/            auth theo Controller/Service/Repository
│   │   ├── routes/                   products, orders, users, categories, stats, upload
│   │   ├── utils/                    validate, s3 (xoá ảnh)
│   │   └── shared/                   AppError, errorHandler, validateBody
│   └── init.sql                      schema + seed data (PG tự chạy lần đầu)
├── frontend/        React 19 + TypeScript + Vite + Redux Toolkit + Tailwind
├── mobile/          React Native (Expo)
├── docs/            Tài liệu từng giai đoạn AWS (xem docs/PROGRESS.md)
└── scripts/         PowerShell: morning/evening/cost-check (lifecycle EC2)
```

## Yêu cầu
- Node.js 20+
- PostgreSQL 15+ (hoặc dùng Docker Compose có sẵn)

## Chạy bằng Docker Compose (khuyến nghị)

```bash
docker compose up -d        # backend + frontend + postgres + pgAdmin
```

## Chạy thủ công

**Backend** → http://localhost:5000

```bash
cd backend
cp .env.example .env        # sửa DB_*, JWT_SECRET nếu cần
npm install
npm run dev
```

**Frontend** → http://localhost:5173

```bash
cd frontend
npm install
npm run dev
```

## Tài khoản demo (seed trong [backend/init.sql](backend/init.sql))

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | admin@fruitshop.vn | admin123 |
| User  | user@fruitshop.vn  | user123  |

## API (prefix `/api`)

| Nhóm | Endpoint tiêu biểu | Auth |
|------|--------------------|------|
| Health | `GET /api/health` | — |
| Auth | `POST /api/auth/login` · `POST /api/auth/register` · `GET /api/auth/me` · `PATCH /api/auth/change-password` | mixed |
| Products | `GET /api/products` · `GET /api/products/:id` · `POST/PUT/DELETE` · `POST /bulk` · `POST /bulk-delete` | admin (ghi) |
| Categories | `GET /api/categories` · `GET /api/categories/tree` · `GET /api/categories/:slug` | — |
| Orders | `GET /api/orders` · `POST /api/orders` · `PATCH /:id/status` (admin) · `PATCH /:id/cancel` | user/admin |
| Users | `GET/POST /api/users` · `GET/PUT/DELETE /:id` · `PATCH /:id/status` | admin (đa số) |
| Stats | `GET /api/stats` · `/daily` · `/top-products` · `/top-customers` · `/by-category` | admin |
| Upload | `POST /api/upload/presign` (S3 presigned URL) | admin |

> **Lưu ý đơn hàng:** giá và `total` được tính lại ở server từ DB (không tin client),
> phí ship miễn phí khi đơn ≥ 300.000đ (mặc khác 30.000đ).

## Deploy lên AWS

Toàn bộ tiến độ, kiến trúc và hướng dẫn từng giai đoạn xem **[docs/PROGRESS.md](docs/PROGRESS.md)**.
