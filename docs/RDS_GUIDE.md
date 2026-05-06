# Hướng dẫn kết nối RDS

## Chuyển từ Docker PostgreSQL → RDS

### Bước 1 — Tạo RDS trên AWS Console
- Engine: PostgreSQL 15
- Template: Free tier (db.t3.micro)
- Storage: 20GB gp2, tắt autoscaling
- Public access: **No**
- VPC Security Group: tạo `myapp-rds-sg`, inbound port 5432 source = EC2 Security Group
- Backup retention: 0 days
- Ghi lại **endpoint** sau khi tạo xong

### Bước 2 — Tạo database và user trong RDS

SSH vào EC2, kết nối RDS bằng master user:
```bash
psql -h <rds-endpoint> -U postgres -d postgres
```

Chạy SQL:
```sql
CREATE USER "userPostgres" WITH PASSWORD '<DB_PASSWORD_trong_SSM>';
CREATE DATABASE todos_db;
GRANT ALL PRIVILEGES ON DATABASE todos_db TO "userPostgres";
\c todos_db
GRANT CREATE ON SCHEMA public TO "userPostgres";
GRANT USAGE ON SCHEMA public TO "userPostgres";

-- Tao bang thu cong (userPostgres khong co quyen CREATE TABLE tren RDS PG15)
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT ALL ON TABLE todos TO "userPostgres";
GRANT ALL ON SEQUENCE todos_id_seq TO "userPostgres";
\q
```

### Bước 3 — Cập nhật SSM
```powershell
aws ssm put-parameter --name "/myapp/production/DB_HOST" --value "<rds-endpoint>" --type String --overwrite --region ap-southeast-1
aws ssm put-parameter --name "/myapp/production/DB_USER" --value "userPostgres" --type String --overwrite --region ap-southeast-1
aws ssm put-parameter --name "/myapp/production/DB_PASSWORD" --value "<password>" --type SecureString --overwrite --region ap-southeast-1
aws ssm put-parameter --name "/myapp/production/DB_NAME" --value "todos_db" --type String --overwrite --region ap-southeast-1
```

### Bước 4 — Cập nhật docker-compose.prod.yml
Xóa service `db` và volume `postgres_data`, xóa `depends_on: db` trong backend và pgadmin.
DB_HOST sẽ tự đọc từ SSM.

> backend/src/db.ts tự động bật SSL khi DB_HOST chứa `rds.amazonaws.com`

### Bước 5 — Deploy
Push code để trigger workflow.

---

## Chuyển từ RDS → Docker PostgreSQL

1. Khôi phục service `db` trong `docker-compose.prod.yml`
2. Cập nhật SSM: `DB_HOST=db`
3. Push code

---

## Xử lý lỗi thường gặp

### `no pg_hba.conf entry ... no encryption`
**Nguyên nhân:** Backend kết nối không SSL, RDS yêu cầu SSL.  
**Fix:** `backend/src/db.ts` đã có SSL auto-detect. Đảm bảo code mới nhất được deploy.

### `password authentication failed for user "userPostgres"`
**Nguyên nhân:** Password trong SSM không khớp với password đặt trong RDS.  
**Fix:**
```bash
# Lay password tu SSM
aws ssm get-parameter --name "/myapp/production/DB_PASSWORD" --with-decryption --query "Parameter.Value" --output text --region ap-southeast-1

# Reset password trong RDS
psql -h <rds-endpoint> -U postgres -d postgres
ALTER USER "userPostgres" WITH PASSWORD '<password_trong_ssm>';
\q
```

### `permission denied for schema public` (code 42501)
**Nguyên nhân:** RDS PostgreSQL 15 mặc định không cho user tạo bảng trong schema public.  
**Fix:** Tạo bảng bằng master user `postgres`, sau đó grant:
```sql
-- Connect as postgres to todos_db
CREATE TABLE IF NOT EXISTS todos (...);
GRANT ALL ON TABLE todos TO "userPostgres";
GRANT ALL ON SEQUENCE todos_id_seq TO "userPostgres";
```
Và trong `backend/src/db.ts`, `initDB()` chỉ chạy `SELECT 1` (không tự tạo bảng).

### `You can't specify MasterUserPassword for an instance with ManageMasterUserPassword enabled`
**Nguyên nhân:** RDS đang dùng Secrets Manager quản lý password, không thể đổi bằng CLI.  
**Fix:** Lấy password từ Secrets Manager:
```powershell
aws secretsmanager get-secret-value --secret-id "<arn>" --query "SecretString" --output text --region ap-southeast-1
```

### Nginx dùng port ngẫu nhiên thay vì port 80
**Nguyên nhân:** `source backend/.env` bị lỗi do password có ký tự đặc biệt → `NGINX_HTTP_PORT` không được export.  
**Fix:** `deploy.yml` phải quote giá trị trong `.env`:
```bash
awk -F'\t' '{n=split($1,a,"/"); print a[n]"='"'"'"$2"'"'"'"}' > backend/.env
```

### pgAdmin mất kết nối sau khi xóa Docker DB
**Nguyên nhân:** pgAdmin đang connect vào service `db` đã bị xóa.  
**Fix:** Add new server trong pgAdmin, kết nối trực tiếp vào RDS endpoint.

---

## Chi phí RDS

| Loại | Chi phí |
|------|---------|
| db.t3.micro (on-demand) | ~$0.021/giờ |
| Storage gp2 20GB | ~$2.76/tháng |
| **1 buổi học (2h)** | **~$0.04** |

**Khuyến nghị cho demo:** Tạo RDS khi cần học, delete ngay sau khi xong.
