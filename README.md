# Todo App — React TS + Express + PostgreSQL

## Cấu trúc
```
Deploy-1/
├── backend/        Express + TypeScript + PostgreSQL
│   ├── src/
│   │   ├── index.ts   (routes)
│   │   └── db.ts      (pool + init table)
│   └── .env
└── frontend/       React + TypeScript + Vite
    └── src/
        └── App.tsx
```

## Yêu cầu
- Node.js 18+
- PostgreSQL đang chạy

## Chạy Backend

```bash
cd backend
npm install
# Sửa .env nếu cần (DB_USER, DB_PASSWORD, DB_NAME)
npm run dev
# → http://localhost:4000
```

## Chạy Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## API

| Method | Path        | Mô tả              |
|--------|-------------|-------------------|
| GET    | /todos      | Lấy tất cả todos  |
| POST   | /todos      | Tạo todo mới      |
| PATCH  | /todos/:id  | Toggle done       |
| DELETE | /todos/:id  | Xoá todo          |
# start
