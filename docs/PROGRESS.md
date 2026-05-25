# AWS DevOps Learning Progress

## Thông tin project
- **Repo:** https://github.com/ngoclong99/fruit_app_cicd
- **Region:** ap-southeast-1 (Singapore)
- **Domain:** vhnlong.store (Route 53, A record được [morning.ps1](../scripts/morning.ps1) UPSERT mỗi sáng theo IP EC2 mới)
- **Production URL:** https://vhnlong.store
- **EC2 IP:** _động — đổi mỗi ngày. Lookup: `aws ec2 describe-instances --region ap-southeast-1 --filters "Name=tag:Name,Values=myapp-ec2" "Name=instance-state-name,Values=running" --query "Reservations[].Instances[].PublicIpAddress" --output text`_
- **IAM Deploy User:** github-actions-deploy
- **ECR Registry:** _(xem trong GitHub Secrets > ECR_REGISTRY)_
- **Daily lifecycle:** EC2 tạo sáng / huỷ tối — xem [SCRIPTS.md](SCRIPTS.md)

---

## Giai đoạn 1 — Nền tảng CI/CD
> Mục tiêu: Deploy được app lên AWS tự động, quản lý secrets đúng cách

### Đã hoàn thành
- [x] Docker + Docker Compose
- [x] EC2 cơ bản (tạo, SSH, terminate)
- [x] ECR (push/pull images)
- [x] GitHub Actions CI/CD pipeline (branch main → port 80)
- [x] Multi-environment workflow (develop → staging → production)
- [x] AWS Parameter Store thay GitHub Secrets cho app secrets
- [x] pgAdmin để quản lý DB qua UI (port 5050/5051)
- [x] 1 EC2 chạy 1 môi trường active tại 1 thời điểm (staging deploy on-demand — xem ghi chú ở mục Ports & URLs bên dưới)
- [x] Tạo branches: `develop`, `staging`, `main`
- [x] Tạo GitHub Environments (development / staging / production)
- [x] Tạo SSM Parameters cho production và staging
- [x] Thêm IAM policy SSM cho `github-actions-deploy`

### Còn lại
- [x] Test deploy branch `main` → https://vhnlong.store ✓
- [x] pgAdmin http://&lt;EC2-IP&gt;:5050 ✓
- [ ] Staging deploy on-demand (hiện tại nginx hardcode `80:80`/`443:443` trong [docker-compose.prod.yml](../docker-compose.prod.yml) → muốn chạy đồng thời với production phải wire lại biến `NGINX_HTTP_PORT` vào compose)

---

## Ports & URLs

| Môi trường | App URL | pgAdmin | Branch | Thư mục EC2 |
|---|---|---|---|---|
| production | https://vhnlong.store | http://&lt;EC2-IP&gt;:5050 | main | ~/app/production/ |
| staging | _(chung EC2 với prod, deploy on-demand — không chạy đồng thời)_ | http://&lt;EC2-IP&gt;:5051 | staging | ~/app/staging/ |
| development | http://localhost | http://localhost:5050 | local | máy local |

> **Lưu ý IP:** `<EC2-IP>` thay đổi mỗi sáng do [morning.ps1](../scripts/morning.ps1) tạo EC2 mới. Lookup IP hiện tại bằng lệnh trong section "Lệnh hay dùng" bên dưới hoặc chạy `.\scripts\cost-check.ps1`. Truy cập app qua domain `vhnlong.store` thì không cần biết IP (Route 53 tự cập nhật).
>
> **Lưu ý staging:** Production và staging hiện dùng chung EC2. Nginx hardcode `80:80`/`443:443` nên 2 môi trường không thể chạy đồng thời. Muốn deploy staging: dừng production trước, hoặc wire `${NGINX_HTTP_PORT}` vào [docker-compose.prod.yml](../docker-compose.prod.yml) (đã có sẵn trong SSM).

---

## SSM Parameters đã tạo

> AWS Console → Systems Manager → Parameter Store
> Kiểm tra: `aws ssm get-parameters-by-path --region ap-southeast-1 --path "/myapp/" --recursive --query "Parameters[*].Name" --output table`

### /myapp/production/
| Parameter | Value | Ý nghĩa |
|---|---|---|
| DB_NAME | todos_db | Tên database production |
| DB_USER | userPostgres | Username database |
| DB_PASSWORD | _(ẩn)_ | Password database |
| VITE_API_URL | https://vhnlong.store | URL API cho frontend gọi (dùng domain, không IP) |
| NGINX_HTTP_PORT | 80 | Port nginx lắng nghe (hiện hardcode 80:80 trong compose) |
| PGADMIN_PORT | 5050 | Port truy cập pgAdmin |
| PGADMIN_EMAIL | admin@myapp.com | Email đăng nhập pgAdmin |
| PGADMIN_PASSWORD | _(ẩn)_ | Password pgAdmin |

### /myapp/staging/
| Parameter | Value | Ý nghĩa |
|---|---|---|
| DB_NAME | todos_db_staging | DB riêng, không lẫn với production |
| DB_USER | userPostgres | Username database |
| DB_PASSWORD | _(ẩn)_ | Password database |
| VITE_API_URL | https://vhnlong.store | URL API staging (chung domain với prod do dùng chung EC2) |
| NGINX_HTTP_PORT | 8080 | _(không có hiệu lực — compose đang hardcode 80:80; xem ghi chú staging ở mục Ports & URLs)_ |
| PGADMIN_PORT | 5051 | Port khác production tránh conflict |
| PGADMIN_EMAIL | admin@myapp.com | Email đăng nhập pgAdmin |
| PGADMIN_PASSWORD | _(ẩn)_ | Password pgAdmin |

> **Lưu ý:** Giá trị VITE_API_URL trên đây phản ánh setup HTTPS hiện tại. Verify giá trị thật trong SSM bằng: `aws ssm get-parameter --region ap-southeast-1 --name "/myapp/production/VITE_API_URL" --query "Parameter.Value" --output text`. Nếu khác → cập nhật SSM bằng `aws ssm put-parameter ... --overwrite` để khớp với domain.

---

## GitHub Secrets & Environments

### Repository secrets (dùng chung mọi môi trường)
| Secret | Ý nghĩa |
|---|---|
| AWS_ACCESS_KEY_ID | Credentials của `github-actions-deploy` để đăng nhập AWS |
| AWS_SECRET_ACCESS_KEY | Credentials của `github-actions-deploy` |
| ECR_REGISTRY | URL kho chứa Docker images trên AWS |

### Environment secrets (mỗi môi trường riêng)
| Secret | Ý nghĩa |
|---|---|
| EC2_HOST | IP của EC2 server môi trường đó |
| EC2_SSH_KEY | Nội dung file .pem để SSH vào EC2 |

---

## Lệnh hay dùng

```bash
# Lấy IP EC2 hiện tại (IP đổi mỗi ngày do morning.ps1)
aws ec2 describe-instances --region ap-southeast-1 \
  --filters "Name=tag:Name,Values=myapp-ec2" "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].PublicIpAddress" --output text

# Kiểm tra SSM parameters đã tạo
aws ssm get-parameters-by-path --region ap-southeast-1 --path "/myapp/" --recursive --query "Parameters[*].Name" --output table

# Xem giá trị 1 parameter (có giải mã)
aws ssm get-parameter --region ap-southeast-1 --name "/myapp/production/DB_PASSWORD" --with-decryption --query "Parameter.Value" --output text

# Kiểm tra EC2 instances đang chạy (đầy đủ thông tin)
aws ec2 describe-instances --region ap-southeast-1 --query "Reservations[*].Instances[*].{ID:InstanceId,State:State.Name,IP:PublicIpAddress,Name:Tags[?Key=='Name']|[0].Value}" --output table

# SSH vào EC2 (thay <EC2-IP> bằng IP lấy ở lệnh trên)
ssh -i $env:USERPROFILE\.ssh\deploy-ec2.pem ubuntu@<EC2-IP>

# Xem containers đang chạy trên EC2
docker ps

# Xem logs của 1 container
docker logs myapp-production-backend-1 --tail 50

# Deploy staging thủ công (chỉ chạy khi production đã tắt — xem lưu ý ở Ports & URLs)
git checkout staging && git merge main && git push origin staging
```

---

## Quy trình hàng ngày

Project dùng chiến lược tạo/huỷ EC2 mỗi ngày qua PowerShell scripts để tiết kiệm chi phí khi học AWS. Chi tiết từng script: [SCRIPTS.md](SCRIPTS.md).

| Khi nào | Lệnh | Tác dụng |
|---|---|---|
| Sáng — bắt đầu học | `.\scripts\morning.ps1` | Tạo EC2 + ECR repos, update Route 53 A record, set GitHub Secret `EC2_HOST`, cài Docker/Certbot/SSL, trigger deploy workflow |
| Trong ngày | _(làm việc bình thường: push code → GitHub Actions tự deploy)_ | |
| Tối — kết thúc | `.\scripts\evening.ps1` | Terminate EC2, xoá ECR repos, release Elastic IP chưa gắn |
| Bất kỳ lúc nào | `.\scripts\cost-check.ps1` | Audit toàn bộ resources đang tốn tiền, có menu xoá thủ công |
| Lần đầu / khi morning.ps1 fail | `.\scripts\setup-ec2.ps1 -IP <ec2-ip>` | Cài Docker + Certbot + SSL trên EC2 đã có sẵn |

---

## 🚧 Migration đang lên kế hoạch — S3 + CloudFront cho Frontend

> **Status:** Docs hoàn tất, chờ thực thi. Chi tiết: **[S3_FRONTEND.md](S3_FRONTEND.md)**.

### Tại sao
Hiện tại FE serve qua nginx trên EC2 → bị down từ tối → sáng do EC2 huỷ bởi `evening.ps1`. Migrate sang S3 + CloudFront để:
- FE accessible 24/7 (không phụ thuộc EC2 lifecycle)
- Học CloudFront / S3 static hosting (Giai đoạn 6 advanced)
- Giảm ~50% chi phí EC2 (downgrade `t3.small → t3.micro` vì BE không serve assets)

### Kiến trúc đích (sau migration)

| Domain | Trỏ vào | Vai trò |
|---|---|---|
| `vhnlong.store` | CloudFront alias → S3 bucket | React SPA (24/7) |
| `api.vhnlong.store` | A record → EC2 IP (đổi mỗi sáng) | Backend REST API |

### Roadmap thực thi
- [ ] Phase 1: AWS Infrastructure setup (manual qua Console) — S3 bucket, ACM cert us-east-1, CloudFront distribution, Route 53 records
- [ ] Phase 2: Backend changes — nginx config sang `api.vhnlong.store`, xoá frontend container khỏi docker-compose
- [ ] Phase 3: CI/CD split — `deploy-backend.yml` + `deploy-frontend.yml` riêng biệt
- [ ] Phase 4: Scripts update — morning.ps1, evening.ps1, setup-ec2.ps1; thêm cleanup-frontend.ps1
- [ ] Phase 5: SSM updates — VITE_API_URL, CORS_ORIGIN
- [ ] Phase 6: FE code cleanup — xoá frontend/Dockerfile
- [ ] Phase 7: Cutover + smoke test (big-bang)
- [ ] Phase 8: Update docs này khi hoàn tất

Mở [docs/S3_FRONTEND.md](S3_FRONTEND.md) để xem hướng dẫn từng bước.

---

## Giai đoạn 2 — Data & Bảo mật
> Mục tiêu: Data không mất, app an toàn hơn

- [x] **RDS** — học xong, hiểu migrate Docker DB → RDS. Hiện revert về Docker DB để tiết kiệm chi phí demo. Xem [RDS_GUIDE.md](RDS_GUIDE.md)
- [x] **S3** — lưu file upload (ảnh, documents)
- [x] **HTTPS** — `https://vhnlong.store` với Let's Encrypt + Certbot
- [x] **Security Group** — mở đúng port: 22, 80, 443, 5050, 5051, 8080
- [x] **IAM** — EC2 Instance Role `myapp-ec2-role`, least privilege (ECR read, SSM read)

---

## Giai đoạn 3 — High Availability
> Mục tiêu: App không chết khi có sự cố
> **Master guide:** [PHASE_3_HA.html](PHASE_3_HA.html) · **Đào sâu ALB/DNS:** [ALB_DNS.html](ALB_DNS.html)

- [x] **ALB** — đã setup + verify đủ 8 test thực tế (25/5/2026), đã cleanup sau khi học xong (hết tốn $0.50/ngày). Resource hiện đã xóa, kiến trúc revert về `Route 53 A → IP EC2`. Bài học chi tiết + script cleanup trong [PHASE_3_HA.html#module-a](PHASE_3_HA.html#module-a)
- [ ] **Auto Scaling Group** — docs đầy đủ, chưa thực thi. Cost ~$15-45/tháng nếu để 2 EC2 24/7
- [ ] **Multi-AZ RDS** — docs đầy đủ, chưa thực thi. Cost ~$30+/tháng → khuyến cáo skip cho demo, học qua [RDS_GUIDE.html](RDS_GUIDE.html)
- [x] **Health checks** — đã verify trong Module A (ALB target health pass /api/health mỗi 30s, detect failure trong 60s)
- [ ] **Zero-downtime deploy** — phụ thuộc ASG, chưa làm

---

## Giai đoạn 4 — Container Orchestration
> Mục tiêu: Không cần quản lý EC2 thủ công

- [ ] **ECS Fargate** — chạy container không cần quản lý server
- [ ] **ECR lifecycle policy** — tự xoá images cũ tiết kiệm chi phí
- [ ] **CloudWatch** — monitoring, alerts, logs tập trung
- [ ] **Blue/Green deployment** — deploy an toàn, rollback trong 1 phút

---

## Giai đoạn 5 — Infrastructure as Code
> Mục tiêu: Tạo/xoá toàn bộ hạ tầng bằng code, tái tạo môi trường chỉ 1 lệnh

- [ ] **Terraform** — viết code để tạo EC2, RDS, ALB, VPC
- [ ] **Modules** — tái sử dụng infrastructure code
- [ ] **Remote state** — lưu Terraform state trên S3

---

## Giai đoạn 6 — Advanced
> Mục tiêu: Vận hành production như công ty thật

- [ ] **CloudFront + S3** — CDN serve FE từ S3 — _Docs done, chờ thực thi:_ [S3_FRONTEND.md](S3_FRONTEND.md)
- [ ] **WAF** — chặn tấn công DDoS, SQL injection
- [ ] **Secrets Manager** — rotate secrets tự động, audit trail
- [ ] **Cost optimization** — Spot instances, Reserved instances
- [ ] **Multi-region** — deploy nhiều khu vực

---

## Ghi chú cá nhân
_(Ghi lại những vấn đề gặp phải, cách giải quyết, điều cần nhớ)_

- Git Bash Windows tự convert path `/myapp/...` → dùng `MSYS_NO_PATHCONV=1` hoặc PowerShell
- SSM PutParameter phải chạy trên máy local, không phải trên EC2
