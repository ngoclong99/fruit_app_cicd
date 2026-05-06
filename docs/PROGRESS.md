# AWS DevOps Learning Progress

## Thông tin project
- **Repo:** https://github.com/ngoclong99/start
- **Region:** ap-southeast-1 (Singapore)
- **EC2 IP:** 13.229.216.57
- **IAM Deploy User:** github-actions-deploy
- **ECR Registry:** _(xem trong GitHub Secrets > ECR_REGISTRY)_

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
- [x] 1 EC2 chạy nhiều môi trường (port khác nhau)
- [x] Tạo branches: `develop`, `staging`, `main`
- [x] Tạo GitHub Environments (development / staging / production)
- [x] Tạo SSM Parameters cho production và staging
- [x] Thêm IAM policy SSM cho `github-actions-deploy`

### Còn lại
- [x] Test deploy branch `main` → http://13.229.216.57 ✓
- [x] pgAdmin http://13.229.216.57:5050 ✓
- [x] Test deploy branch `staging` → xác nhận http://13.229.216.57:8080

---

## Ports & URLs

| Môi trường | App | pgAdmin | Branch | Thư mục EC2 |
|---|---|---|---|---|
| production | http://13.229.216.57 | http://13.229.216.57:5050 | main | ~/app/production/ |
| staging | http://13.229.216.57:8080 | http://13.229.216.57:5051 | staging | ~/app/staging/ |
| development | http://localhost | http://localhost:5050 | local | máy local |

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
| VITE_API_URL | http://13.229.216.57 | URL API cho frontend gọi |
| NGINX_HTTP_PORT | 80 | Port nginx lắng nghe trên EC2 |
| PGADMIN_PORT | 5050 | Port truy cập pgAdmin |
| PGADMIN_EMAIL | admin@myapp.com | Email đăng nhập pgAdmin |
| PGADMIN_PASSWORD | _(ẩn)_ | Password pgAdmin |

### /myapp/staging/
| Parameter | Value | Ý nghĩa |
|---|---|---|
| DB_NAME | todos_db_staging | DB riêng, không lẫn với production |
| DB_USER | userPostgres | Username database |
| DB_PASSWORD | _(ẩn)_ | Password database |
| VITE_API_URL | http://13.229.216.57:8080 | URL API staging |
| NGINX_HTTP_PORT | 8080 | Port khác production tránh conflict |
| PGADMIN_PORT | 5051 | Port khác production tránh conflict |
| PGADMIN_EMAIL | admin@myapp.com | Email đăng nhập pgAdmin |
| PGADMIN_PASSWORD | _(ẩn)_ | Password pgAdmin |

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
# Kiểm tra SSM parameters đã tạo
aws ssm get-parameters-by-path --region ap-southeast-1 --path "/myapp/" --recursive --query "Parameters[*].Name" --output table

# Xem giá trị 1 parameter (có giải mã)
aws ssm get-parameter --region ap-southeast-1 --name "/myapp/production/DB_PASSWORD" --with-decryption --query "Parameter.Value" --output text

# Kiểm tra EC2 instances đang chạy
aws ec2 describe-instances --region ap-southeast-1 --query "Reservations[*].Instances[*].{ID:InstanceId,State:State.Name,IP:PublicIpAddress,Name:Tags[?Key=='Name']|[0].Value}" --output table

# SSH vào EC2
ssh -i myapp-key.pem ubuntu@13.229.216.57

# Xem containers đang chạy trên EC2
docker ps

# Xem logs của 1 container
docker logs myapp-production-backend-1 --tail 50

# Deploy staging thủ công (test)
git checkout staging && git merge main && git push origin staging
```

---

## Giai đoạn 2 — Data & Bảo mật
> Mục tiêu: Data không mất, app an toàn hơn

- [x] **RDS** — học xong, hiểu migrate Docker DB → RDS. Hiện revert về Docker DB để tiết kiệm chi phí demo. Xem [RDS_GUIDE.md](RDS_GUIDE.md)
- [ ] **S3** — lưu file upload (ảnh, documents)
- [x] **HTTPS** — `https://vhnlong.store` với Let's Encrypt + Certbot
- [x] **Security Group** — mở đúng port: 22, 80, 443, 5050, 5051, 8080
- [x] **IAM** — EC2 Instance Role `myapp-ec2-role`, least privilege (ECR read, SSM read)

---

## Giai đoạn 3 — High Availability
> Mục tiêu: App không chết khi có sự cố

- [ ] **ALB** — load balancer, DNS cố định (không phụ thuộc IP)
- [ ] **Auto Scaling Group** — tự thêm/bớt EC2 theo traffic
- [ ] **Multi-AZ RDS** — DB tự failover khi 1 zone chết
- [ ] **Health checks** — tự phát hiện EC2 lỗi, thay thế tự động
- [ ] **Zero-downtime deploy** — deploy không gián đoạn user

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

- [ ] **CloudFront** — CDN, cache frontend toàn cầu, giảm latency
- [ ] **WAF** — chặn tấn công DDoS, SQL injection
- [ ] **Secrets Manager** — rotate secrets tự động, audit trail
- [ ] **Cost optimization** — Spot instances, Reserved instances
- [ ] **Multi-region** — deploy nhiều khu vực

---

## Ghi chú cá nhân
_(Ghi lại những vấn đề gặp phải, cách giải quyết, điều cần nhớ)_

- Git Bash Windows tự convert path `/myapp/...` → dùng `MSYS_NO_PATHCONV=1` hoặc PowerShell
- SSM PutParameter phải chạy trên máy local, không phải trên EC2
