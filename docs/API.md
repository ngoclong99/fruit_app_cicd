# API Reference — Fruit Shop REST API

Spec chuẩn cho toàn bộ HTTP API của backend. Tất cả endpoint có prefix `/api`.

## Quy ước chung (REST conventions)

| Hạng mục | Quy ước |
|----------|---------|
| **Base URL** | `https://<host>/api` (prod: `https://vhnlong.store`) |
| **Định dạng** | JSON request/response, `Content-Type: application/json` |
| **Auth** | JWT Bearer: header `Authorization: Bearer <token>` |
| **Resource naming** | Danh từ số nhiều: `products`, `orders`, `users`, `categories` |
| **Định danh** | `:id` (products/orders/users), `:slug` (categories) |

### HTTP methods

| Method | Ý nghĩa | Ví dụ |
|--------|---------|-------|
| `GET` | Đọc (list / chi tiết) | `GET /api/products` |
| `POST` | Tạo mới / action không-CRUD | `POST /api/orders` |
| `PATCH` | **Cập nhật một phần** (chuẩn cho partial update) | `PATCH /api/products/:id` |
| `PUT` | _Alias backward-compat của PATCH_ — dùng PATCH cho code mới | `PUT /api/products/:id` |
| `DELETE` | Xoá | `DELETE /api/products/:id` |

### HTTP status codes

| Code | Khi nào |
|------|---------|
| `200 OK` | GET / PATCH / action thành công |
| `201 Created` | Tạo resource thành công (POST) |
| `204 No Content` | DELETE thành công (không body) |
| `400 Bad Request` | Input sai/thiếu (validate thủ công), logic sai (vd `from > to`) |
| `401 Unauthorized` | Thiếu / sai / hết hạn token |
| `403 Forbidden` | Có token nhưng không đủ quyền |
| `404 Not Found` | Resource / endpoint không tồn tại |
| `409 Conflict` | Xung đột (vd email đã tồn tại) |
| `422 Unprocessable Entity` | Schema validation thất bại (zod — các route auth) |
| `429 Too Many Requests` | Vượt rate limit |
| `500 Internal Server Error` | Lỗi không lường trước |

### Response envelope — **format thống nhất TOÀN BỘ API**

Mọi response JSON đều có trường `code` = đúng HTTP status (client kiểm tra
`code === 200` để biết thành công). Bọc tự động bởi middleware
[responseEnvelope](../backend/src/shared/middleware/responseEnvelope.ts).

**Thành công (2xx):**
```jsonc
{ "code": 200, "message": "OK", "data": <payload> }
```
POST tạo mới → `code: 201`. DELETE → `204 No Content` (không body, đúng chuẩn HTTP).

**Lỗi (4xx/5xx):**
```jsonc
{
  "code": 400,                    // = HTTP status
  "error": "BAD_REQUEST",         // mã semantic, 1 code/status
  "message": "price is required", // mô tả người-đọc-được
  "details": { /* optional, lỗi validation zod */ }
}
```

Mã `error`: `BAD_REQUEST` · `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` ·
`CONFLICT` · `VALIDATION_ERROR` · `RATE_LIMITED` · `INTERNAL_ERROR`.

**Catalog mã lỗi (single source of truth + 2 mirror — giữ đồng bộ):**
- BE: [backend/src/shared/errors/errorCodes.ts](../backend/src/shared/errors/errorCodes.ts)
- FE web: [frontend/src/shared/errors/errorCodes.ts](../frontend/src/shared/errors/errorCodes.ts)
- Mobile: [mobile/src/shared/errors/errorCodes.ts](../mobile/src/shared/errors/errorCodes.ts)

**Xử lý phía client (không check status thủ công):** axios interceptor là bộ kiểm
tra trung tâm — `2xx` → **bóc lớp envelope**, trả thẳng `data` cho component (giữ
nguyên code cũ); `!2xx` → tạo `ApiError {code,status,message}` (message map từ
catalog/i18n) và **tự bật 1 alert lỗi toàn cục** (web: qua `DialogContext`). Riêng
endpoint auth (login/register) hiển thị lỗi inline.
Chi tiết: [frontend/src/shared/errors/apiError.ts](../frontend/src/shared/errors/apiError.ts).

### Pagination (list có phân trang: products, orders)

Query: `?page=<n>&limit=<n>`. Trên dây (wire) là envelope lồng payload phân trang:

```jsonc
{
  "code": 200, "message": "OK",
  "data": { "data": [ /* ... */ ], "total": 120, "page": 1, "limit": 12, "totalPages": 10 }
}
```
> FE interceptor bóc 1 lớp envelope → component nhận `{ data, total, page, limit, totalPages }`.

---

## Endpoints

### Auth — `/api/auth`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/login` | — | Đăng nhập → `{ token, user }`. Rate limit 10/15ph |
| POST | `/register` | — | Đăng ký → `201 { token, user }`. Rate limit 10/15ph |
| GET | `/me` | user | Thông tin user hiện tại |
| PATCH | `/change-password` | user | Đổi mật khẩu |

### Products — `/api/products`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/` | — | List (phân trang). Query: `category, search, badge, sort, page, limit` |
| GET | `/:id` | — | Chi tiết |
| POST | `/` | admin | Tạo → `201` |
| PATCH | `/:id` | admin | Cập nhật một phần (PUT = alias) |
| DELETE | `/:id` | admin | Xoá → `204`, dọn ảnh S3 nền |
| POST | `/bulk` | admin | Tạo nhiều (≤1000, transaction) → `201 { created, data }` |
| POST | `/bulk-delete` | admin | Xoá nhiều theo `{ ids }` → `{ deleted }` |

### Categories — `/api/categories`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/` | — | Danh sách phẳng |
| GET | `/tree` | — | Cây danh mục (lồng `children`) |
| GET | `/:slug` | — | Chi tiết theo slug |

### Orders — `/api/orders`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/` | user | List (admin thấy tất cả; user chỉ đơn của mình). Query: `status, from, to, page, limit` |
| GET | `/:id` | user/owner | Chi tiết (owner hoặc admin) |
| POST | `/` | user | Tạo đơn. **Giá & total tính lại ở server từ DB** (chống gian lận) → `201` |
| PATCH | `/:id/status` | admin | Đổi trạng thái đơn |
| PATCH | `/:id/cancel` | user/owner | Huỷ đơn (chỉ khi `pending`) |

### Users — `/api/users`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/` | admin | Danh sách user (mảng trần) |
| GET | `/:id` | self/admin | Chi tiết (chính mình hoặc admin) |
| POST | `/` | admin | Tạo user → `201` |
| PATCH | `/:id` | self/admin | Cập nhật (role/status chỉ admin). PUT = alias |
| DELETE | `/:id` | admin | Xoá (không xoá được admin) → `204` |
| PATCH | `/:id/status` | admin | Khoá/mở user |

### Stats — `/api/stats` _(admin only)_
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/` | Tổng quan: revenue, counts, statusCounts, monthlyRevenue, recentOrders |
| GET | `/daily` | Theo ngày. Query bắt buộc: `from, to` (YYYY-MM-DD) |
| GET | `/top-products` | Top sản phẩm bán chạy. Query: `limit` |
| GET | `/top-customers` | Top khách hàng. Query: `limit` |
| GET | `/by-category` | Doanh thu theo danh mục |

### Upload — `/api/upload`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/presign` | admin | Presigned URL upload ảnh thẳng lên S3 → `{ uploadUrl, publicUrl, key }` |

### Health
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/health` | `{ status: "ok" }` |
