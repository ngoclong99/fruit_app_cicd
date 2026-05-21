# Hướng dẫn deploy Frontend trên S3 + CloudFront

> **Đối tượng:** Người chưa có kinh nghiệm CloudFront, đang học AWS qua project demo.
> **Mục tiêu:** Migrate frontend từ EC2/nginx → S3 + CloudFront để FE accessible 24/7, không phụ thuộc EC2 lifecycle (huỷ mỗi tối qua [evening.ps1](../scripts/evening.ps1)).
> **Phiên bản:** v1 — Subdomain split (`vhnlong.store` FE, `api.vhnlong.store` BE)

---

## Mục lục

1. [Tại sao migrate](#1-tại-sao-migrate)
2. [Kiến trúc đích](#2-kiến-trúc-đích)
3. [Chi phí](#3-chi-phí)
4. [Prerequisites](#4-prerequisites)
5. [Phase 1 — AWS Infrastructure Setup](#phase-1--aws-infrastructure-setup-manual-qua-console)
6. [Phase 2 — Backend Code Changes](#phase-2--backend-code-changes)
7. [Phase 3 — CI/CD Workflow Split](#phase-3--cicd-workflow-split)
8. [Phase 4 — Scripts Update](#phase-4--scripts-update)
9. [Phase 5 — SSM Parameter Updates](#phase-5--ssm-parameter-updates)
10. [Phase 6 — Frontend Code Cleanup](#phase-6--frontend-code-cleanup)
11. [Phase 7 — Cutover & Smoke Test](#phase-7--cutover--smoke-test)
12. [Quy trình hàng ngày sau migration](#quy-trình-hàng-ngày-sau-migration)
13. [Cleanup khi học xong](#cleanup-khi-học-xong)
14. [Troubleshooting](#troubleshooting)
15. [AWS CLI Cheat Sheet](#aws-cli-cheat-sheet)
16. [Rollback plan](#rollback-plan)

---

## 1. Tại sao migrate?

### Vấn đề hiện tại
- EC2 huỷ mỗi tối → cả frontend **và** backend đều down → user truy cập `https://vhnlong.store` từ 19:00 đến 8:00 hôm sau bị lỗi
- Build frontend trong CI/CD nặng (npm install + vite build + docker build + ECR push) — tốn ~2 phút mỗi deploy
- 1 EC2 phục vụ cả FE + BE → không tận dụng được S3/CloudFront free tier

### Giải pháp
- **Frontend** chuyển sang S3 static hosting + CloudFront CDN → 24/7, gần như free, HTTPS native qua ACM
- **Backend** giữ trên EC2 (nhưng có thể downgrade `t3.small` → `t3.micro` vì không serve static assets nữa) ở subdomain `api.vhnlong.store`
- Daily lifecycle: morning/evening chỉ ảnh hưởng BE; FE luôn live

### Tại sao Subdomain split (`vhnlong.store` vs `api.vhnlong.store`)?

So với 2 cách khác:
- **Same-domain CloudFront route cả FE+BE:** CloudFront có thể route `/api/*` → EC2 origin, `/*` → S3 origin. Nhưng phức tạp với người mới (Behaviors, Origin policies) và mỗi API request đi qua CloudFront thêm 50-100ms.
- **Vercel/Netlify thay vì S3:** đơn giản hơn nhưng không học được AWS.

→ Subdomain split là cân bằng tốt nhất giữa độ phức tạp và giá trị học.

### Tại sao có lợi cho project demo này?
- App dùng **JWT Bearer token** (đọc từ `Authorization` header), không dùng cookie → CORS không cần `credentials: true` → setup đơn giản
- `cors` package đã có sẵn trong backend ([backend/package.json](../backend/package.json)) → chỉ cần update env var
- `VITE_API_URL` đã được build-time inject → chỉ đổi giá trị SSM
- Không cần đổi React Router config

---

## 2. Kiến trúc đích

```
                     ┌──────────────────────────────────┐
                     │   Route 53 — vhnlong.store zone  │
                     └──────────────────────────────────┘
                       │                               │
                       │ ALIAS A                       │ A record
                       │ (cố định)                     │ (update mỗi sáng)
                       ▼                               ▼
              ┌────────────────────┐         ┌────────────────────┐
              │   CloudFront       │         │   EC2 t3.micro     │
              │   distribution     │         │   (BE-only)        │
              │   (us-east-1 cert) │         │   ap-southeast-1   │
              └────────────────────┘         └────────────────────┘
                       │                               │
                       │ origin = S3 (OAC)             │ port 443
                       ▼                               ▼
              ┌────────────────────┐         ┌────────────────────┐
              │  S3 bucket         │         │  nginx (TLS)       │
              │  vhnlong.store-fe  │         │  └─ /api → :5000   │
              │  (static dist/)    │         └────────────────────┘
              └────────────────────┘                  │
                                                       ▼
                                              ┌────────────────────┐
                                              │  Node.js backend   │
                                              │  Docker container  │
                                              └────────────────────┘
                                                       │
                                                       ▼
                                              ┌────────────────────┐
                                              │  PostgreSQL        │
                                              │  Docker volume     │
                                              └────────────────────┘
```

| Domain | Trỏ vào | Vai trò |
|---|---|---|
| `vhnlong.store` | CloudFront (alias) | Phục vụ React SPA |
| `www.vhnlong.store` | CloudFront (alias) | Redirect/alias cho root |
| `api.vhnlong.store` | EC2 IP (A record, đổi mỗi sáng) | Backend REST API |

### Data flow

1. User mở `https://vhnlong.store`
2. DNS resolve → CloudFront → S3 → trả về `index.html`
3. Browser load JS/CSS từ CloudFront (cache hit gần như luôn luôn)
4. React app bootstrap → call `https://api.vhnlong.store/api/products`
5. DNS resolve → EC2 → nginx (TLS terminate) → proxy `/api/*` → Node.js port 5000
6. Backend trả JSON kèm CORS header `Access-Control-Allow-Origin: https://vhnlong.store`
7. Browser accept (vì JWT trong `Authorization` header — không phải cookie)

---

## 3. Chi phí

| Service | Free tier | Demo usage thực tế | Chi phí ước tính |
|---|---|---|---|
| S3 storage | 5 GB | ~50 MB (dist + assets) | $0 |
| S3 requests | 20k GET, 2k PUT/tháng | ~5k GET/tháng | $0 |
| CloudFront data transfer out | 1 TB/tháng (12 tháng đầu) | < 1 GB/tháng | $0 |
| CloudFront requests | 10 triệu HTTPS req/tháng (12 tháng) | < 50k/tháng | $0 |
| ACM Certificate | Miễn phí với CloudFront/ALB | 1 cert | $0 |
| Route 53 hosted zone | Không có free tier | 1 zone | ~$0.50/tháng |
| Route 53 queries | 1 tỷ queries first/month | < 10k/tháng | $0.0004 (gần như $0) |
| EC2 t3.micro (8h/ngày) | 750 hr/tháng (12 tháng đầu) | 240 hr/tháng | $0 nếu free tier còn |
| EBS gp2 8GB (EC2 root) | 30 GB/tháng free | 8 GB | $0 nếu free tier còn |

**Tổng chi phí thực tế ước tính:** ~$0.50/tháng (Route 53 hosted zone) + cost EC2 nếu hết free tier (~$2.50/tháng cho 240 hr).

So với hiện tại (EC2 t3.small 8h/ngày ≈ $5/tháng), **migration tiết kiệm ~50% chi phí EC2** nhờ downgrade xuống t3.micro được do FE không còn ăn RAM trên EC2.

---

## 4. Prerequisites

### Trên máy local
- [ ] AWS CLI v2 đã cấu hình (`aws configure`) — đã có từ trước
- [ ] GitHub CLI đã login (`gh auth status`) — đã có từ trước
- [ ] Quyền IAM `github-actions-deploy` có thể được mở rộng bởi root account hoặc IAM admin
- [ ] Đăng nhập được AWS Console qua trình duyệt

### Trên AWS
- [ ] Hosted zone `vhnlong.store` đã tồn tại trên Route 53 (zone ID `Z0999500HD1JE8VHHDN2`)
- [ ] Domain `vhnlong.store` đã trỏ về Route 53 nameservers (NS records ở registrar)
- [ ] Account chưa hit limit S3 buckets (mặc định 100, không lo)

### Trong repo
- [ ] Branch `main` đang ở trạng thái deployable (test thành công trên https://vhnlong.store hôm nay)
- [ ] Không có PR pending chưa merge

---

## Phase 1 — AWS Infrastructure Setup (Manual qua Console)

> **Ước tính:** 1.5 giờ. Phần lớn thời gian là chờ ACM cert validate (~5-30 phút) và CloudFront deploy (~5-15 phút).
>
> **Strategy:** Làm manual qua Console lần đầu để học. Khi học xong, dùng [cleanup-frontend.ps1](../scripts/cleanup-frontend.ps1) để xoá.

### Step 1.1 — Tạo S3 bucket

**Mục đích:** Lưu trữ React `dist/` (HTML, JS, CSS bundle) làm static assets cho CloudFront serve.

1. Đăng nhập AWS Console → **S3** service
2. Đảm bảo đang ở region **ap-southeast-1** (Singapore — góc trên bên phải Console)
3. Click **Create bucket**
4. Cài đặt:
   - **Bucket name:** `vhnlong.store-fe`
     > **Lưu ý:** S3 bucket name phải globally unique. Nếu tên này đã có người dùng → thử `vhnlong-store-fe` hoặc thêm suffix random.
   - **AWS Region:** `ap-southeast-1`
   - **Object Ownership:** ACLs disabled (recommended)
   - **Block Public Access settings:** **GIỮ TICK** "Block all public access" (CloudFront sẽ truy cập qua OAC — không cần public bucket)
   - **Bucket Versioning:** Disable (demo không cần)
   - **Default encryption:** SSE-S3 (mặc định, miễn phí)
5. Click **Create bucket**

**Verify:** Bucket xuất hiện trong list S3 → click vào → tab "Properties" → confirm region và encryption.

---

### Step 1.2 — Upload dist test thủ công (optional, để verify bucket hoạt động)

> Bước này không bắt buộc nhưng giúp confirm bucket OK trước khi setup CloudFront. Có thể skip nếu muốn.

```powershell
# Build frontend trên máy local
cd e:\AWS\Deploy-1\frontend
npm ci
$env:VITE_API_URL = "https://api.vhnlong.store"  # giá trị tạm để build test
npm run build

# Upload dist lên S3 (Note: lúc này access deny vì bucket private, nhưng upload vẫn được vì bạn là owner)
aws s3 sync dist/ s3://vhnlong.store-fe --delete --region ap-southeast-1

# Verify
aws s3 ls s3://vhnlong.store-fe --region ap-southeast-1
```

> **Lưu ý:** Lúc này nếu mở `https://vhnlong.store-fe.s3.amazonaws.com/index.html` sẽ bị **403 AccessDenied** — đây là expected behavior vì bucket private. CloudFront mới được phép đọc qua OAC ở Step 1.4.

---

### Step 1.3 — Request ACM Certificate (BẮT BUỘC region `us-east-1`)

**Mục đích:** Cert SSL để CloudFront serve HTTPS cho domain `vhnlong.store`.

> ⚠️ **Gotcha cực kỳ quan trọng:** CloudFront CHỈ đọc ACM cert từ region **us-east-1 (N. Virginia)**, dù app của bạn chạy ở `ap-southeast-1`. Nếu tạo cert nhầm region → CloudFront sẽ không thấy.

1. AWS Console → **switch region về `us-east-1`** (góc trên bên phải, chọn "N. Virginia")
2. Vào service **Certificate Manager (ACM)**
3. Click **Request a certificate** → chọn **Request a public certificate** → Next
4. Cài đặt:
   - **Fully qualified domain name:** `vhnlong.store`
   - Click **Add another name** → `www.vhnlong.store`
   - **Validation method:** **DNS validation - recommended**
   - **Key algorithm:** RSA 2048 (mặc định)
5. Click **Request**
6. Cert sẽ ở status **Pending validation**. Click vào cert → tab "Domains" hiển thị 2 CNAME records cần thêm vào Route 53
7. **Cách nhanh:** Click **Create records in Route 53** → ACM tự động thêm CNAME validation records vào hosted zone
8. Đợi 5-30 phút. Refresh trang ACM → status chuyển sang **Issued** (màu xanh)

**Verify:**
```powershell
aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='vhnlong.store'].[CertificateArn,Status]" --output table
```
→ Status phải là `ISSUED`. Ghi lại **Certificate ARN** (dạng `arn:aws:acm:us-east-1:xxx:certificate/yyy`).

> **Nếu cert stuck ở "Pending" sau 30 phút:** Vào Route 53 → confirm các CNAME validation records đã được tạo và đúng giá trị. ACM hiển thị "Pending validation" cho đến khi nó verify được CNAME.

---

### Step 1.4 — Tạo CloudFront Distribution

**Mục đích:** Phục vụ S3 bucket qua HTTPS với CDN global cache.

1. AWS Console → **switch region về `us-east-1`** (CloudFront là global service, nhưng UI hiển thị ở us-east-1)
2. Vào service **CloudFront** → **Create distribution**
3. Cài đặt phần **Origin:**
   - **Origin domain:** click vào dropdown → chọn `vhnlong.store-fe.s3.ap-southeast-1.amazonaws.com`
     > ⚠️ Phải chọn **REST API endpoint** (dạng `*.s3.<region>.amazonaws.com`), KHÔNG phải Website endpoint (`*.s3-website-<region>.amazonaws.com`). REST endpoint hỗ trợ OAC, website endpoint thì không.
   - **Origin path:** để trống
   - **Name:** auto-fill (`vhnlong.store-fe.s3.ap-southeast-1.amazonaws.com`)
   - **Origin access:** chọn **Origin access control settings (recommended)**
     - Click **Create new OAC** → name mặc định OK → **Sign requests** = Yes → **Create**
   - CloudFront sẽ hiện banner vàng: "You must update the S3 bucket policy" — **GHI NHỚ** cái này, sẽ làm ở step cuối
   - **Add custom header:** để trống
   - **Enable Origin Shield:** No (tốn thêm tiền)

4. Phần **Default cache behavior:**
   - **Path pattern:** `Default (*)` (không sửa được)
   - **Viewer protocol policy:** **Redirect HTTP to HTTPS** (quan trọng)
   - **Allowed HTTP methods:** **GET, HEAD** (FE static chỉ cần GET)
   - **Restrict viewer access:** No
   - **Cache key and origin requests:** chọn **Cache policy and origin request policy (recommended)**
     - **Cache policy:** `CachingOptimized` (managed, cache 1 ngày mặc định)
     - **Origin request policy:** để trống (không cần forward header gì đặc biệt cho static FE)
     - **Response headers policy:** để trống
   - **Compress objects automatically:** Yes (gzip cho JS/CSS)

5. Phần **Web Application Firewall (WAF):**
   - **Do not enable security protections** (demo, tiết kiệm tiền)

6. Phần **Settings:**
   - **Price class:** chọn **Use only North America and Europe** (rẻ nhất) hoặc **Use North America, Europe, Asia, Middle East, and Africa** nếu muốn nhanh ở VN
     > Demo: chọn cái nào cũng được, ở VN sẽ thấy chậm hơn 50-100ms với option rẻ.
   - **Alternate domain name (CNAME):**
     - Add: `vhnlong.store`
     - Add: `www.vhnlong.store`
   - **Custom SSL certificate:** click dropdown → chọn cert vừa tạo ở Step 1.3 (`vhnlong.store`)
     > Nếu không thấy cert trong dropdown: cert chưa Issued, hoặc bạn không ở region us-east-1.
   - **Security policy:** `TLSv1.2_2021` (mặc định)
   - **Supported HTTP versions:** HTTP/2 (mặc định)
   - **Default root object:** `index.html` ← QUAN TRỌNG cho SPA
   - **Standard logging:** Off (tiết kiệm tiền — bật khi cần debug)
   - **IPv6:** Off (đơn giản hơn)

7. **Description:** `vhnlong.store FE — S3 via CloudFront`

8. Click **Create distribution**

9. **Cập nhật S3 bucket policy** (CloudFront sẽ hiển thị banner nhắc):
   - Click **Copy policy** ở banner vàng
   - Vào S3 → bucket `vhnlong.store-fe` → tab **Permissions** → **Bucket policy** → **Edit** → paste policy → **Save**
   - Policy ví dụ:
     ```json
     {
       "Version": "2008-10-17",
       "Id": "PolicyForCloudFrontPrivateContent",
       "Statement": [
         {
           "Sid": "AllowCloudFrontServicePrincipal",
           "Effect": "Allow",
           "Principal": { "Service": "cloudfront.amazonaws.com" },
           "Action": "s3:GetObject",
           "Resource": "arn:aws:s3:::vhnlong.store-fe/*",
           "Condition": {
             "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::<account-id>:distribution/<dist-id>" }
           }
         }
       ]
     }
     ```

10. **Đợi CloudFront deploy:** Status chuyển từ `Deploying` → `Deployed` (mất 5-15 phút). Khi xong, hiển thị:
    - **Distribution domain name:** `dxxxxxxxxxxxx.cloudfront.net`
    - **ID:** `E2YYYYYYYYYY` ← **GHI LẠI** (cần dùng cho GitHub Secret)

---

### Step 1.5 — Cấu hình Custom Error Responses (SPA routing fallback)

**Tại sao:** React SPA dùng client-side routing. Khi user refresh ở `/products` → CloudFront hỏi S3 cho `/products` → S3 trả 404 (vì chỉ có `/index.html`). Phải config CloudFront 404 → trả về `/index.html` với status 200 để React Router xử lý.

1. Vào CloudFront distribution vừa tạo → tab **Error pages**
2. Click **Create custom error response**
   - **HTTP error code:** `404: Not Found`
   - **Error caching minimum TTL:** `10` seconds
   - **Customize error response:** **Yes**
     - **Response page path:** `/index.html`
     - **HTTP Response code:** `200: OK`
3. Click **Create custom error response**
4. Lặp lại cho `403: Forbidden` (S3 OAC trả 403 cho path không tồn tại thay vì 404):
   - HTTP error code: `403`
   - Error caching minimum TTL: `10`
   - Response page path: `/index.html`
   - HTTP Response code: `200`

**Verify:** Tab "Error pages" hiển thị 2 entries cho 403 và 404.

---

### Step 1.6 — Test CloudFront → S3 (chưa đụng Route 53)

```powershell
# Lấy CloudFront domain
$DIST_ID = "E2YYYYYYYYYY"  # thay bằng ID thật
$CF_DOMAIN = aws cloudfront get-distribution --id $DIST_ID --query "Distribution.DomainName" --output text
Write-Host "CloudFront domain: $CF_DOMAIN"

# Test load
curl -I "https://$CF_DOMAIN"
# Expect: HTTP/2 200, header "x-cache: Miss from cloudfront" (lần đầu) hoặc "Hit" (lần sau)
# Header "server: CloudFront"
```

Mở trình duyệt: `https://dxxxxx.cloudfront.net/` → phải load React app (nếu đã upload dist ở Step 1.2). Nếu chưa upload dist, sẽ thấy lỗi 403 với content `index.html` không tồn tại — đây là dấu hiệu CloudFront đã hoạt động, chỉ thiếu content.

**Trouble:**
- 403 AccessDenied: bucket policy chưa đúng — recheck Step 1.4.9
- 504 Gateway Timeout: CloudFront chưa deploy xong — đợi thêm
- Certificate error: cert ARN sai region (phải us-east-1)

---

### Step 1.7 — Route 53 Records

**Mục đích:** Trỏ domain thật về CloudFront và Subdomain api về EC2.

1. AWS Console → **Route 53** → **Hosted zones** → click `vhnlong.store`
2. **Xoá A record `vhnlong.store`** hiện tại (đang trỏ về IP EC2):
   - Tick record → **Delete record** → Confirm
3. **Tạo A record alias cho root domain:**
   - Click **Create record**
   - **Record name:** để trống (root domain)
   - **Record type:** A
   - **Alias:** **bật toggle**
   - **Route traffic to:** chọn **Alias to CloudFront distribution**
   - **Region:** auto (us-east-1)
   - **Choose distribution:** dropdown chọn distribution vừa tạo (hiển thị `dxxxxx.cloudfront.net`)
   - **Routing policy:** Simple
   - Click **Create records**
4. **Tạo A record alias cho `www.vhnlong.store`** (giống bước 3 nhưng record name = `www`)
5. **Tạo A record cho `api.vhnlong.store`** (KHÔNG alias):
   - Click **Create record**
   - **Record name:** `api`
   - **Record type:** A
   - **Alias:** Off
   - **Value:** IP của EC2 hiện tại
   - **TTL:** `60` seconds (low để morning.ps1 update DNS nhanh)
   - **Routing policy:** Simple
   - Click **Create records**

**Verify:**
```powershell
# DNS check (đợi 1-5 phút để propagate)
nslookup vhnlong.store
# Expect: trả về CloudFront IPs (nhiều IPs khác nhau, không phải 1 IP fixed)

nslookup api.vhnlong.store
# Expect: trả về IP EC2 hiện tại

nslookup www.vhnlong.store
# Expect: CloudFront IPs

# HTTPS check
curl -I https://vhnlong.store
# Expect: HTTP/2 200, x-cache header from CloudFront

curl -I https://api.vhnlong.store
# Expect: cert error (cert hiện tại cho vhnlong.store, không cho api.*) — sẽ fix ở Phase 4 khi morning.ps1 chạy
```

---

## Phase 2 — Backend Code Changes

> **Ước tính:** 30 phút. Mostly xoá nhiều hơn thêm.

### File cần sửa: [nginx/default.conf](../nginx/default.conf)

**Thay đổi cần làm:**
1. `server_name` ở cả block 80 và 443 đổi từ `vhnlong.store www.vhnlong.store` → `api.vhnlong.store`
2. Xoá upstream `frontend_srv` (không có frontend container nữa)
3. Xoá `location /` block (proxy frontend)
4. Giữ nguyên `location /api/` proxy backend
5. SSL cert path đổi: `/etc/letsencrypt/live/api.vhnlong.store/fullchain.pem` (và `privkey.pem`)

**Diff outline:**
```nginx
# TRƯỚC:
server {
  listen 443 ssl http2;
  server_name vhnlong.store www.vhnlong.store;
  ssl_certificate /etc/letsencrypt/live/vhnlong.store/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/vhnlong.store/privkey.pem;
  ...
  location /api/ { proxy_pass http://backend_srv; ... }
  location /     { proxy_pass http://frontend_srv; ... }    # XOÁ
}
upstream frontend_srv { server frontend:80; }                # XOÁ
upstream backend_srv  { server backend:5000; }               # GIỮ

# SAU:
server {
  listen 443 ssl http2;
  server_name api.vhnlong.store;
  ssl_certificate /etc/letsencrypt/live/api.vhnlong.store/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.vhnlong.store/privkey.pem;
  ...
  location /api/ { proxy_pass http://backend_srv; ... }
}
upstream backend_srv { server backend:5000; }
```

### File cần sửa: [docker-compose.prod.yml](../docker-compose.prod.yml)

**Xoá toàn bộ service `frontend`:**
```yaml
# XOÁ block này:
  frontend:
    image: ${ECR_REGISTRY}/myapp-frontend:${IMAGE_TAG:-latest}
    restart: always
    networks: [app-net]
```

**Trong service `nginx`, sửa `depends_on`:**
```yaml
# TRƯỚC: depends_on: [frontend, backend]
# SAU:    depends_on: [backend]
```

### Backend code (`backend/src/index.ts`) — KHÔNG cần sửa

CORS đã được config đọc từ env `CORS_ORIGIN`. Chỉ cần update SSM (xem [Phase 5](#phase-5--ssm-parameter-updates)).

```typescript
// backend/src/index.ts:15-19 — giữ nguyên
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
```

> **Note:** `credentials: true` không gây hại dù app dùng JWT Bearer. Chỉ cần `CORS_ORIGIN` là exact string (không phải `*`).

---

## Phase 3 — CI/CD Workflow Split

> **Ước tính:** 45 phút.

### File 1: Rename `.github/workflows/deploy.yml` → `deploy-backend.yml`

**Thay đổi:**
1. Thêm `paths` filter để không trigger khi chỉ sửa FE:
   ```yaml
   on:
     push:
       branches: [main]
       paths: ['backend/**', 'docker-compose.prod.yml', 'nginx/**', '.github/workflows/deploy-backend.yml']
   ```
2. **Xoá** step "Fetch VITE_API_URL from Parameter Store" (không build FE nữa)
3. **Xoá** step "Setup Node.js"
4. **Xoá** step "Build frontend on runner"
5. **Xoá** step "Build & push frontend"
6. Trong step "Copy config files to EC2", `source` bỏ frontend nếu có (giữ `docker-compose.prod.yml,nginx/default.conf,backend/.env,backend/init.sql`)

### File 2: Tạo mới `.github/workflows/deploy-frontend.yml`

```yaml
name: Deploy Frontend to S3 + CloudFront

on:
  push:
    branches: [main]
    paths: ['frontend/**', '.github/workflows/deploy-frontend.yml']
  workflow_dispatch:

env:
  AWS_REGION: ap-southeast-1
  S3_BUCKET: vhnlong.store-fe

jobs:
  deploy:
    name: Build & Deploy FE
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Fetch VITE_API_URL from SSM
        run: |
          VITE_API_URL=$(aws ssm get-parameter \
            --name "/myapp/production/VITE_API_URL" \
            --query "Parameter.Value" --output text)
          echo "VITE_API_URL=$VITE_API_URL" >> $GITHUB_ENV

      - name: Build frontend
        working-directory: frontend
        env:
          VITE_API_URL: ${{ env.VITE_API_URL }}
        run: |
          npm ci
          npm run build

      - name: Sync to S3
        run: |
          aws s3 sync frontend/dist/ s3://${{ env.S3_BUCKET }} \
            --delete \
            --cache-control "public,max-age=31536000,immutable" \
            --exclude "index.html"
          # index.html cache ngắn để user thấy update sớm
          aws s3 cp frontend/dist/index.html s3://${{ env.S3_BUCKET }}/index.html \
            --cache-control "public,max-age=60"

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

> **Tip về cache-control:** Vite hash filename của JS/CSS (vd `index-abc123.js`) → set cache 1 năm, immutable. Riêng `index.html` thì cache 60s để user thấy update nhanh khi deploy mới.

### IAM Policy expand cho `github-actions-deploy`

**Cách 1: Manual qua Console**
1. IAM → Users → `github-actions-deploy` → **Add permissions** → **Attach inline policy**
2. Paste JSON:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "S3FrontendBucket",
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:PutObjectAcl",
           "s3:DeleteObject",
           "s3:GetObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::vhnlong.store-fe",
           "arn:aws:s3:::vhnlong.store-fe/*"
         ]
       },
       {
         "Sid": "CloudFrontInvalidation",
         "Effect": "Allow",
         "Action": ["cloudfront:CreateInvalidation"],
         "Resource": "*"
       }
     ]
   }
   ```
3. Policy name: `github-actions-frontend-deploy` → **Create policy**

**Cách 2: CLI**
```powershell
# Lưu JSON ở trên vào file frontend-deploy-policy.json
aws iam put-user-policy `
  --user-name github-actions-deploy `
  --policy-name FrontendDeployPolicy `
  --policy-document file://frontend-deploy-policy.json
```

### GitHub Secret mới

```powershell
# Lấy distribution ID từ Phase 1.4
$DIST_ID = "E2YYYYYYYYYY"
gh secret set CLOUDFRONT_DISTRIBUTION_ID --body $DIST_ID --repo ngoclong99/fruit_app_cicd
```

(Lưu ý: repo đã đổi tên thành `fruit_app_cicd`; xem [docs/PROGRESS.md](PROGRESS.md))

---

## Phase 4 — Scripts Update

> **Ước tính:** 30 phút.

### [scripts/morning.ps1](../scripts/morning.ps1) — Sửa các điểm

| Vị trí | Thay đổi |
|---|---|
| Line 14: `$DOMAIN = "vhnlong.store"` | → `$DOMAIN_ROOT = "vhnlong.store"` + `$API_DOMAIN = "api.vhnlong.store"` |
| Step 1 (line ~27): mảng ECR repos `@("myapp-backend", "myapp-frontend")` | → `@("myapp-backend")` |
| Step 3 (line ~82): biến `$CHANGE` UPSERT 2 records `vhnlong.store` + `www.vhnlong.store` | Đổi thành chỉ 1 record `api.vhnlong.store` |
| Step 5 (line ~146): certbot xin cert cho `$DOMAIN` + `www.$DOMAIN` | Xin cho `$API_DOMAIN` only (bỏ www) |
| Step 6 (line ~180): trigger `deploy.yml` | → `deploy-backend.yml` |
| Cuối file (line ~186): `URL: https://$DOMAIN` | → `URL: https://$DOMAIN_ROOT` (FE) và thêm `API: https://$API_DOMAIN` |

**Biến `$CHANGE` mới:**
```powershell
$CHANGE = '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"' + $API_DOMAIN + '","Type":"A","TTL":60,"ResourceRecords":[{"Value":"' + $PUBLIC_IP + '"}]}}]}'
```

> **Lưu ý:** Vì `vhnlong.store` và `www.*` giờ alias CloudFront (cố định), morning.ps1 không update nữa. Chỉ `api.*` cần update mỗi sáng.

### [scripts/evening.ps1](../scripts/evening.ps1) — 1 thay đổi

Line ~49: mảng `@("myapp-backend", "myapp-frontend")` → `@("myapp-backend")`. (Không xoá ECR `myapp-frontend` nữa vì repo đã không còn ở Phase 4 morning. Nếu repo vẫn tồn tại từ migration thời điểm cũ, có thể chạy 1 lần evening.ps1 cũ rồi mới chuyển sang version mới.)

### [scripts/setup-ec2.ps1](../scripts/setup-ec2.ps1) — Sửa

Line 12: `$DOMAIN = "vhnlong.store"` → `$DOMAIN = "api.vhnlong.store"`

Line ~42 (certbot command): bỏ `-d www.$DOMAIN` → chỉ giữ `-d $DOMAIN`

### File mới: [scripts/cleanup-frontend.ps1](../scripts/cleanup-frontend.ps1)

```powershell
# ============================================================
# cleanup-frontend.ps1 — Xoá toàn bộ infra S3/CloudFront khi học xong
# Chạy: .\scripts\cleanup-frontend.ps1
# ============================================================

$REGION_FE   = "ap-southeast-1"       # S3 ở Singapore
$REGION_CERT = "us-east-1"            # ACM cert cho CloudFront
$BUCKET      = "vhnlong.store-fe"

Write-Host "=== Cleanup S3 + CloudFront ===" -ForegroundColor Cyan
Write-Host "CẢNH BÁO: Script này XOÁ VĨNH VIỄN S3 bucket, CloudFront distribution, ACM cert" -ForegroundColor Red
$confirm = Read-Host "Tiếp tục? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Đã huỷ." -ForegroundColor Yellow
    exit 0
}

# ─── 1. Empty + delete S3 bucket ─────────────────────────────
Write-Host "`n[1/4] Xoá S3 bucket $BUCKET..." -ForegroundColor Cyan
aws s3 rm s3://$BUCKET --recursive --region $REGION_FE 2>&1 | Out-Null
aws s3 rb s3://$BUCKET --region $REGION_FE
if ($LASTEXITCODE -eq 0) {
    Write-Host "    Bucket deleted." -ForegroundColor Green
} else {
    Write-Host "    Lỗi (có thể bucket đã không tồn tại)" -ForegroundColor Yellow
}

# ─── 2. Disable + delete CloudFront distribution ─────────────
Write-Host "`n[2/4] Disable + delete CloudFront distribution..." -ForegroundColor Cyan
$DIST_ID = Read-Host "Nhập CloudFront Distribution ID (vd E2YYYYYYYYYY)"
if (-not $DIST_ID) {
    Write-Host "    Skip CloudFront cleanup (không có ID)" -ForegroundColor Yellow
} else {
    # Get current config + ETag
    $configFile = "tmp-cf-config.json"
    aws cloudfront get-distribution-config --id $DIST_ID --output json > $configFile
    $etag = aws cloudfront get-distribution-config --id $DIST_ID --query "ETag" --output text
    
    # Read JSON, set Enabled=false, write back (chỉ DistributionConfig phần)
    $json = Get-Content $configFile | ConvertFrom-Json
    $json.DistributionConfig.Enabled = $false
    $json.DistributionConfig | ConvertTo-Json -Depth 100 > "tmp-cf-disabled.json"
    
    # Disable distribution
    aws cloudfront update-distribution --id $DIST_ID --if-match $etag --distribution-config file://tmp-cf-disabled.json | Out-Null
    Write-Host "    Disabled. Đợi 15 phút để CloudFront propagate disable..." -ForegroundColor Yellow
    
    # Wait until status = Deployed (after disable)
    aws cloudfront wait distribution-deployed --id $DIST_ID
    Write-Host "    Disable hoàn tất." -ForegroundColor Green
    
    # Delete (need new ETag)
    $etag2 = aws cloudfront get-distribution --id $DIST_ID --query "ETag" --output text
    aws cloudfront delete-distribution --id $DIST_ID --if-match $etag2
    Write-Host "    Distribution deleted." -ForegroundColor Green
    
    # Cleanup temp files
    Remove-Item tmp-cf-config.json, tmp-cf-disabled.json -ErrorAction SilentlyContinue
}

# ─── 3. Delete ACM Certificate (us-east-1) ───────────────────
Write-Host "`n[3/4] Delete ACM Certificate..." -ForegroundColor Cyan
$CERT_ARN = aws acm list-certificates --region $REGION_CERT --query "CertificateSummaryList[?DomainName=='vhnlong.store'].CertificateArn | [0]" --output text
if ($CERT_ARN -and $CERT_ARN -ne "None") {
    aws acm delete-certificate --certificate-arn $CERT_ARN --region $REGION_CERT
    Write-Host "    Cert deleted: $CERT_ARN" -ForegroundColor Green
} else {
    Write-Host "    Không tìm thấy cert cho vhnlong.store" -ForegroundColor Yellow
}

# ─── 4. Restore Route 53 ─────────────────────────────────────
Write-Host "`n[4/4] Khôi phục Route 53 (vhnlong.store → EC2)..." -ForegroundColor Cyan
Write-Host "    Lưu ý: cần làm thủ công qua Console hoặc chạy morning.ps1 với version cũ" -ForegroundColor Yellow
Write-Host "    Bước manual:" -ForegroundColor Yellow
Write-Host "      1. Vào Route 53 → xoá alias records vhnlong.store và www.vhnlong.store" -ForegroundColor Gray
Write-Host "      2. Tạo lại A records trỏ về EC2 IP hiện tại" -ForegroundColor Gray
Write-Host "      3. Xoá A record api.vhnlong.store (không cần nữa)" -ForegroundColor Gray

Write-Host "`n=== HOÀN THÀNH ===" -ForegroundColor Green
Write-Host "Đừng quên:" -ForegroundColor Yellow
Write-Host "  - Xoá GitHub Secret CLOUDFRONT_DISTRIBUTION_ID" -ForegroundColor Gray
Write-Host "  - Xoá IAM policy github-actions-frontend-deploy nếu không dùng nữa" -ForegroundColor Gray
Write-Host "  - Xoá SSM /myapp/production/CORS_ORIGIN (nếu rollback BE)" -ForegroundColor Gray
```

> ⚠️ **Lưu ý quan trọng:** CloudFront delete cần distribution disabled trước → tổng thời gian ~15 phút (wait distribution-deployed). Script sẽ chạy đợi đó.

---

## Phase 5 — SSM Parameter Updates

> **Ước tính:** 10 phút.

```powershell
# 1. Đổi VITE_API_URL (frontend build-time)
aws ssm put-parameter `
  --name "/myapp/production/VITE_API_URL" `
  --value "https://api.vhnlong.store" `
  --type String --overwrite `
  --region ap-southeast-1

# 2. Set CORS_ORIGIN (backend runtime)
aws ssm put-parameter `
  --name "/myapp/production/CORS_ORIGIN" `
  --value "https://vhnlong.store" `
  --type String --overwrite `
  --region ap-southeast-1

# 3. Xoá NGINX_HTTP_PORT (không dùng vì nginx hardcode 443 ssl)
aws ssm delete-parameter `
  --name "/myapp/production/NGINX_HTTP_PORT" `
  --region ap-southeast-1

# Verify
aws ssm get-parameters-by-path `
  --path "/myapp/production/" --recursive `
  --query "Parameters[*].[Name,Value]" --output table `
  --region ap-southeast-1
```

**Expected SSM state sau update:**

| Parameter | Value | Note |
|---|---|---|
| `/myapp/production/DB_NAME` | `todos_db` | Không đổi |
| `/myapp/production/DB_USER` | `userPostgres` | Không đổi |
| `/myapp/production/DB_PASSWORD` | (SecureString) | Không đổi |
| `/myapp/production/VITE_API_URL` | `https://api.vhnlong.store` | **MỚI** |
| `/myapp/production/CORS_ORIGIN` | `https://vhnlong.store` | **MỚI** |
| `/myapp/production/PGADMIN_PORT` | `5050` | Không đổi |
| `/myapp/production/PGADMIN_EMAIL` | `admin@myapp.com` | Không đổi |
| `/myapp/production/PGADMIN_PASSWORD` | (SecureString) | Không đổi |
| ~~`/myapp/production/NGINX_HTTP_PORT`~~ | ~~80~~ | **ĐÃ XOÁ** |

> **Note:** Backend tự reload `CORS_ORIGIN` khi deploy lần kế (workflow `deploy-backend.yml` fetch tất cả SSM vào `backend/.env`).

---

## Phase 6 — Frontend Code Cleanup

> **Ước tính:** 15 phút.

### Xoá file không còn dùng

1. **Xoá** [frontend/Dockerfile](../frontend/Dockerfile)
   ```powershell
   Remove-Item e:\AWS\Deploy-1\frontend\Dockerfile
   ```
2. **Xoá** `frontend/.dockerignore` nếu có
3. (Không cần đụng [frontend/vite.config.ts](../frontend/vite.config.ts) — không cần `base:`)
4. (Không cần đụng [frontend/src/api/axios.ts](../frontend/src/api/axios.ts) — logic đúng)

### Giữ lại
- Tất cả file trong `frontend/src/` — code app không đổi
- `frontend/package.json`, `package-lock.json` — vẫn build với `npm run build`

---

## Phase 7 — Cutover & Smoke Test

> **Ước tính:** 30 phút. **Đây là phase risk cao nhất** vì cutover đồng thời nhiều thứ.

### Trình tự big-bang cutover

1. **Tạo 1 PR duy nhất** lên main chứa toàn bộ thay đổi Phase 2-6 (KHÔNG merge ngay)
2. **Trước khi merge:**
   - [ ] AWS Console: confirm Phase 1 done — S3 bucket, ACM cert (us-east-1, Issued), CloudFront (Deployed), Route 53 records
   - [ ] GitHub Secret `CLOUDFRONT_DISTRIBUTION_ID` đã set
   - [ ] IAM policy đã expand cho `github-actions-deploy`
   - [ ] SSM update (Phase 5) đã chạy
3. **Merge PR** → push main → 2 workflows trigger song song:
   - `deploy-backend.yml`: SSH EC2, deploy compose mới (không có FE container), nginx config mới
     - ⚠️ Bước này sẽ break tạm thời truy cập `https://vhnlong.store` qua EC2 (cert hiện tại cho `vhnlong.store`, nginx giờ chỉ phục vụ `api.vhnlong.store`)
   - `deploy-frontend.yml`: build → sync S3 → invalidate CloudFront
4. **Đợi cả 2 workflows xanh** (xem GitHub Actions tab)
5. **Chạy lại** `morning.ps1` (đã update Phase 4) để Certbot xin cert mới cho `api.vhnlong.store` và update Route 53 A record `api.*` → IP EC2 hiện tại
6. **Smoke test** (xem section bên dưới)

### Smoke test checklist

```powershell
# 1. Frontend từ CloudFront
curl -I https://vhnlong.store
# Expect: HTTP/2 200
# Expect headers: server: CloudFront, x-cache: Miss/Hit from cloudfront
# NEU FAIL: check DNS đã propagate chưa (nslookup), check CloudFront status

# 2. CloudFront serve SPA index.html
curl -s https://vhnlong.store | Select-String "<title>"
# Expect: <title>... </title> với tên app

# 3. CloudFront SPA fallback
curl -I https://vhnlong.store/random-route
# Expect: HTTP/2 200 (KHÔNG phải 404) — vì error 404→index.html

# 4. API subdomain HTTPS
curl -I https://api.vhnlong.store/health
# Expect: HTTP/1.1 200 OK (assume có endpoint /health, nếu không thử /api/products)
# Headers: server: nginx, ssl cert: Let's Encrypt cho api.vhnlong.store

# 5. CORS preflight
curl -i -X OPTIONS https://api.vhnlong.store/api/products `
  -H "Origin: https://vhnlong.store" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: authorization,content-type"
# Expect: HTTP 204 No Content
# Expect header: access-control-allow-origin: https://vhnlong.store
# Expect header: access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE
# Expect header: access-control-allow-headers: authorization,content-type
# NEU FAIL "No 'Access-Control-Allow-Origin' header": SSM CORS_ORIGIN chưa đúng,
#   hoặc backend chưa redeploy với env mới

# 6. End-to-end (browser)
# - Mở https://vhnlong.store
# - F12 DevTools → tab Network
# - Refresh page (Ctrl+F5)
# - Kiểm tra:
#   - HTML từ vhnlong.store (alias → CloudFront)
#   - JS/CSS từ CloudFront (header server: CloudFront)
#   - Sau khi React mount, XHR `/api/*` → https://api.vhnlong.store/api/*
#   - Status 200, có response data
#   - Không có CORS error trong Console
# - Test login:
#   - Login flow phải work (POST /api/auth/login → trả JWT → lưu localStorage)
#   - Sau login, header `Authorization: Bearer xxx` được attach
# - Test refresh ở route nested:
#   - Vào /products → refresh → vẫn load /products (SPA fallback work)
```

### Rollback nếu fail

**Trường hợp 1: FE không load (`https://vhnlong.store` lỗi)**
1. Route 53: xoá alias records, tạo lại A records trỏ về EC2 IP (như cũ)
2. Đợi DNS propagate (TTL 60s, max 5 phút)
3. Git revert PR migration → push main → workflow cũ deploy lại EC2/nginx serve FE

**Trường hợp 2: BE không respond (`https://api.vhnlong.store` 503)**
1. SSH EC2 → check `docker ps` xem containers nào up/down
2. Check `docker logs myapp-production-nginx-1 --tail 100` xem nginx error gì
3. Common: cert chưa được xin cho `api.vhnlong.store` → chạy lại morning.ps1 OR manual `sudo certbot certonly --standalone -d api.vhnlong.store --non-interactive --agree-tos --email longvhn1999@gmail.com`

**Trường hợp 3: CORS lỗi trong browser**
1. Verify SSM: `aws ssm get-parameter --name "/myapp/production/CORS_ORIGIN" --query "Parameter.Value" --output text --region ap-southeast-1`
2. Verify backend container env: `docker exec myapp-production-backend-1 printenv | findstr CORS_ORIGIN`
3. Nếu env chưa có CORS_ORIGIN → trigger lại deploy-backend.yml để fetch SSM mới
4. Manual fix tạm: `docker exec -it myapp-production-backend-1 sh -c 'export CORS_ORIGIN=https://vhnlong.store; npm start'` (chỉ dùng để test, sẽ revert khi container restart)

---

## Quy trình hàng ngày sau migration

| Khi nào | Hành động | Tác động |
|---|---|---|
| Sáng | `.\scripts\morning.ps1` | Tạo EC2 mới (BE only), xin cert cho `api.vhnlong.store`, update Route 53 A record `api.*`, deploy BE |
| Trong ngày — push `frontend/**` | Auto: `deploy-frontend.yml` | Build → S3 sync → CloudFront invalidate (~2 phút) |
| Trong ngày — push `backend/**` | Auto: `deploy-backend.yml` | Build BE image → ECR push → SSH EC2 redeploy (~3 phút) |
| Tối | `.\scripts\evening.ps1` | Terminate EC2, xoá ECR `myapp-backend`. **KHÔNG đụng** S3/CloudFront |
| Đêm/cuối tuần | _(rest)_ | FE vẫn live qua S3/CloudFront. BE down — chỉ ảnh hưởng API calls |

### Quan sát thực tế
- User mở `https://vhnlong.store` lúc 11 giờ đêm vẫn thấy FE (chỉ trang chủ, list products cũng load vì có cached SSR/static data?)
- Khi user thử login → fail vì BE down → hiển thị error message phù hợp (do FE đã code error boundary)
- Sáng hôm sau khi `morning.ps1` xong (~10 phút) → BE up trở lại → user reload → mọi thứ work

---

## Cleanup khi học xong

> Khi bạn đã học xong và muốn xoá tất cả để dừng tốn tiền.

### Bước 1: Backup data nếu cần
```powershell
# Dump database trước (nếu muốn giữ data cho lần sau)
$EC2_IP = aws ec2 describe-instances --region ap-southeast-1 `
  --filters "Name=tag:Name,Values=myapp-ec2" "Name=instance-state-name,Values=running" `
  --query "Reservations[].Instances[].PublicIpAddress" --output text
ssh -i E:\AWS\deploy-ec2.pem ubuntu@$EC2_IP `
  "docker exec myapp-production-db-1 pg_dump -U userPostgres todos_db" > backup-$(Get-Date -Format yyyyMMdd).sql
```

### Bước 2: Tear down EC2/ECR
```powershell
.\scripts\evening.ps1 -Force
```

### Bước 3: Tear down S3 + CloudFront + ACM
```powershell
.\scripts\cleanup-frontend.ps1
# Nhập Distribution ID khi prompt
# Đợi ~15 phút (CloudFront disable trước khi delete)
```

### Bước 4: Manual cleanup
- Route 53 hosted zone (~$0.50/tháng): xoá trên Console nếu không cần domain nữa
- SSM Parameters: xoá tất cả `/myapp/production/*`:
  ```powershell
  aws ssm get-parameters-by-path --path "/myapp/production/" --recursive --query "Parameters[].Name" --output text --region ap-southeast-1 | ForEach-Object {
    aws ssm delete-parameter --name $_ --region ap-southeast-1
  }
  ```
- IAM user `github-actions-deploy`: xoá nếu không học AWS nữa
- GitHub Secrets: xoá `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `ECR_REGISTRY`, `EC2_HOST`, `EC2_SSH_KEY`, `CLOUDFRONT_DISTRIBUTION_ID`

---

## Troubleshooting

### CORS errors

**Symptom:** Browser Console hiển thị:
```
Access to XMLHttpRequest at 'https://api.vhnlong.store/api/products' from origin 'https://vhnlong.store'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**Diagnosis:**
1. Check SSM: `aws ssm get-parameter --name "/myapp/production/CORS_ORIGIN" --query "Parameter.Value" --output text`. Must equal exact origin `https://vhnlong.store` (không trailing slash).
2. Check backend env: SSH EC2 → `docker exec myapp-production-backend-1 printenv | findstr CORS_ORIGIN`
3. Check workflow log: `deploy-backend.yml` có step "Fetch secrets from Parameter Store" — log có hiển thị `CORS_ORIGIN` không?
4. Nginx có forward header `Origin` không? Default nginx forward all headers cho proxy_pass, nên thường OK.

**Fix:** Update SSM với value đúng → trigger lại `deploy-backend.yml` (push 1 commit nhỏ vào `backend/`).

---

### CloudFront cache stale (user vẫn thấy bản FE cũ)

**Symptom:** Đã deploy FE mới (workflow xanh) nhưng user reload vẫn thấy nội dung cũ.

**Diagnosis:**
1. Browser cache: hard refresh (Ctrl+Shift+R hoặc Cmd+Shift+R)
2. CloudFront cache: chưa invalidate xong (mất 5-15 phút)
3. `index.html` cache header dài: check `aws s3api head-object --bucket vhnlong.store-fe --key index.html --region ap-southeast-1 --query "CacheControl"` → phải là `public,max-age=60` (theo workflow YAML)

**Fix:**
```powershell
# Manual invalidation
aws cloudfront create-invalidation --distribution-id E2YYYYYYYYYY --paths "/*"
# Đợi vài phút
```

---

### ACM cert stuck ở "Pending validation"

**Diagnosis:**
1. Vào ACM → cert → tab Domains → xem các CNAME validation records
2. Vào Route 53 → hosted zone vhnlong.store → confirm các CNAME đã được tạo và đúng value
3. `nslookup -type=CNAME <validation-name>.vhnlong.store` để confirm DNS propagate

**Fix:**
- Nếu Route 53 chưa có CNAME: vào ACM → cert → click "Create records in Route 53"
- Nếu CNAME có nhưng cert vẫn Pending sau 1 giờ: delete cert, tạo lại

---

### CloudFront 504 Gateway Timeout

**Symptom:** `curl https://vhnlong.store` trả 504.

**Diagnosis:**
1. CloudFront chưa deploy xong (status Deploying) → đợi
2. S3 bucket policy chưa cho CloudFront đọc → check Step 1.4.9
3. OAC chưa associated với origin → check CloudFront distribution → tab Origins → confirm OAC set

**Fix:** Wait deployment hoàn tất, hoặc paste lại bucket policy từ CloudFront banner.

---

### SPA route refresh trả 404 (`vhnlong.store/products`)

**Diagnosis:** Custom Error Responses chưa được tạo trong CloudFront.

**Fix:** Quay lại [Step 1.5](#step-15--cấu-hình-custom-error-responses-spa-routing-fallback) tạo custom error response 404→index.html (200) và 403→index.html (200).

---

### `npm ci` fail trong CI

**Symptom:** `deploy-frontend.yml` fail ở step "Build frontend".

**Diagnosis:**
1. `package-lock.json` không sync với `package.json` (vd: bạn `npm install <pkg>` nhưng quên commit lock)
2. Node version mismatch (workflow dùng 20, package require khác)

**Fix:**
- Local: `cd frontend; npm install; git add package-lock.json; git commit -m "fix: sync lockfile"; git push`
- Hoặc dùng `npm install` thay `npm ci` (chậm hơn, kém deterministic)

---

### CloudFront delete bị block

**Symptom:** `cleanup-frontend.ps1` fail ở step 2.

**Diagnosis:** Distribution status chưa = "Deployed" sau khi disable. Phải thực sự đợi đủ ~15 phút.

**Fix:**
```powershell
aws cloudfront wait distribution-deployed --id E2YYYYYYYYYY
# Sau đó retry delete
$etag = aws cloudfront get-distribution --id E2YYYYYYYYYY --query "ETag" --output text
aws cloudfront delete-distribution --id E2YYYYYYYYYY --if-match $etag
```

---

## AWS CLI Cheat Sheet

```powershell
# ── S3 ──────────────────────────────────────────────────────
# List bucket contents
aws s3 ls s3://vhnlong.store-fe --region ap-southeast-1

# Sync local dist to S3
aws s3 sync frontend/dist/ s3://vhnlong.store-fe --delete --region ap-southeast-1

# Get single object
aws s3 cp s3://vhnlong.store-fe/index.html . --region ap-southeast-1

# Check bucket size
aws s3 ls s3://vhnlong.store-fe --recursive --summarize --region ap-southeast-1 | findstr "Total"

# ── CloudFront ──────────────────────────────────────────────
# List distributions
aws cloudfront list-distributions --query "DistributionList.Items[].[Id,DomainName,Aliases.Items,Status]" --output table

# Invalidate cache
aws cloudfront create-invalidation --distribution-id E2YYYYYYYYYY --paths "/*"

# Check status
aws cloudfront get-distribution --id E2YYYYYYYYYY --query "Distribution.Status" --output text

# ── ACM ─────────────────────────────────────────────────────
# List certs (us-east-1 cho CloudFront)
aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[].[DomainName,Status,CertificateArn]" --output table

# Cert detail
aws acm describe-certificate --certificate-arn arn:... --region us-east-1

# ── Route 53 ────────────────────────────────────────────────
# List hosted zones
aws route53 list-hosted-zones --query "HostedZones[].[Name,Id]" --output table

# List records of a zone
aws route53 list-resource-record-sets --hosted-zone-id Z0999500HD1JE8VHHDN2 --query "ResourceRecordSets[].[Name,Type,TTL,ResourceRecords[0].Value]" --output table

# ── SSM Parameter Store ─────────────────────────────────────
# Get all under path
aws ssm get-parameters-by-path --path "/myapp/production/" --recursive --with-decryption --query "Parameters[].[Name,Value]" --output table --region ap-southeast-1

# Put parameter
aws ssm put-parameter --name "/myapp/production/CORS_ORIGIN" --value "https://vhnlong.store" --type String --overwrite --region ap-southeast-1

# ── IAM ─────────────────────────────────────────────────────
# List user policies
aws iam list-attached-user-policies --user-name github-actions-deploy

# List inline policies
aws iam list-user-policies --user-name github-actions-deploy
```

---

## Rollback plan

Nếu migration fail và muốn quay về kiến trúc cũ (1 EC2 phục vụ cả FE+BE):

### Bước 1: Khôi phục DNS
1. Route 53 → vhnlong.store hosted zone
2. Xoá 2 alias records (`vhnlong.store` và `www.vhnlong.store`)
3. Tạo lại 2 A records trỏ về EC2 IP hiện tại (TTL 60s)
4. Xoá A record `api.vhnlong.store` (không cần nữa)
5. Đợi 5 phút DNS propagate

### Bước 2: Revert code
```powershell
git checkout main
git revert <commit-hash-of-migration>
git push origin main
# workflow deploy-backend.yml (cũ) tự deploy lại
```

### Bước 3: Restore SSM
```powershell
# Restore VITE_API_URL về URL EC2 hoặc relative
aws ssm put-parameter --name "/myapp/production/VITE_API_URL" --value "https://vhnlong.store" --type String --overwrite --region ap-southeast-1

# CORS_ORIGIN có thể giữ hoặc xoá (BE không dùng nếu same-origin)

# Restore NGINX_HTTP_PORT
aws ssm put-parameter --name "/myapp/production/NGINX_HTTP_PORT" --value "80" --type String --region ap-southeast-1
```

### Bước 4: Chạy lại morning.ps1 (version cũ — nếu đã revert)
Hoặc nếu morning.ps1 đã update version mới, manually xin cert cho `vhnlong.store`:
```powershell
ssh -i E:\AWS\deploy-ec2.pem ubuntu@$EC2_IP
sudo certbot certonly --standalone -d vhnlong.store -d www.vhnlong.store --non-interactive --agree-tos --email longvhn1999@gmail.com
```

### Bước 5: Cleanup S3/CloudFront (optional, nếu chắc chắn không dùng nữa)
```powershell
.\scripts\cleanup-frontend.ps1
```

---

## Tham khảo thêm

- [AWS CloudFront Developer Guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/)
- [AWS S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [ACM Certificate Manager](https://docs.aws.amazon.com/acm/latest/userguide/)
- Project docs liên quan:
  - [PROGRESS.md](PROGRESS.md) — tổng quan project, status migration
  - [SCRIPTS.md](SCRIPTS.md) — chi tiết từng PowerShell script
  - [RDS_GUIDE.md](RDS_GUIDE.md) — guide tương tự cho RDS migration (có thể tham khảo style)
