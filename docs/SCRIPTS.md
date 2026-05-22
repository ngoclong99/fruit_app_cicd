# PowerShell Scripts

Tổng quan PowerShell scripts trong [scripts/](../scripts/) phục vụ chiến lược **tạo EC2 mỗi sáng / huỷ mỗi tối** để tiết kiệm chi phí khi học AWS.

> **Note về migration S3+CloudFront:** Docs phía dưới mô tả scripts **phiên bản hiện tại** (FE serve qua nginx trên EC2). Khi migration ở [S3_FRONTEND.md](S3_FRONTEND.md) được thực thi (Phase 4), một số script sẽ thay đổi và sẽ có thêm `cleanup-frontend.ps1` — xem section ["5. cleanup-frontend.ps1"](#5-cleanup-frontendps1--planned-tear-down-s3--cloudfront-infra) cuối file.

---

## Quy trình tổng thể

```
┌──────────────────┐
│ setup-ec2.ps1    │  1 lần / khi morning.ps1 fail ở bước SSH-setup
│ (one-time)       │  → cài Docker, Certbot, SSL trên EC2 đã có sẵn
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ morning.ps1      │ ──► │ Làm việc cả ngày │ ──► │ evening.ps1      │
│ (mỗi sáng)       │     │ (push code →     │     │ (mỗi tối)        │
│ Tạo EC2 + deploy │     │  Actions deploy) │     │ Terminate all    │
└──────────────────┘     └──────────────────┘     └──────────────────┘

                  cost-check.ps1  ◄── chạy bất kỳ lúc nào để audit
```

---

## 1. morning.ps1 — Khởi động hệ thống hàng ngày

### Mục đích
Tạo EC2 mới + cài đặt + deploy app trong 1 lệnh duy nhất. Sau ~8 phút app đã chạy tại https://vhnlong.store.

### Prerequisites
- AWS CLI v2 đã cấu hình (`aws configure`) với quyền: EC2, ECR, Route 53
- GitHub CLI đã login (`gh auth login`) với scope `repo` để set environment secrets
- PEM key tại `E:\AWS\deploy-ec2.pem`
- Các AWS resource sau **đã tồn tại** (không tự tạo): key pair `deploy-ec2`, Security Group `sg-039475caacad36625`, Subnet `subnet-046de50c5c6c52006`, IAM instance profile `myapp-ec2-role`, Route 53 hosted zone `Z0999500HD1JE8VHHDN2`
- SSM Parameters `/myapp/production/*` đã được tạo sẵn

### Hardcoded values

| Biến | Giá trị | Sửa khi |
|---|---|---|
| `$REGION` | `ap-southeast-1` | Đổi region |
| `$AMI` | `ami-02dd44faa40720bb8` (Ubuntu 22.04 LTS) | AMI deprecated / đổi OS |
| `$INSTANCE_TYPE` | `t3.small` | Đổi size (lưu ý chi phí) |
| `$KEY_NAME` | `deploy-ec2` | Đổi key pair |
| `$SECURITY_GROUP` | `sg-039475caacad36625` | Xoá nhầm SG / đổi VPC |
| `$SUBNET_ID` | `subnet-046de50c5c6c52006` | Đổi VPC |
| `$IAM_PROFILE` | `myapp-ec2-role` | Đổi tên role |
| `$HOSTED_ZONE_ID` | `Z0999500HD1JE8VHHDN2` | Tạo lại hosted zone |
| `$DOMAIN` | `vhnlong.store` | Đổi domain |
| `$GITHUB_REPO` | `ngoclong99/fruit_app_cicd` | Đổi repo |
| `$KEY_PATH` | `E:\AWS\deploy-ec2.pem` | Đổi vị trí key |
| `$EMAIL` | `longvhn1999@gmail.com` | Email đăng ký Let's Encrypt |

### Cách chạy
```powershell
.\scripts\morning.ps1
```
Không có tham số. Tổng thời gian ~8 phút (60s đợi EC2 boot + 60s đợi SSH + 60s đợi DNS propagate + ~3 phút Certbot + ~3 phút GitHub Actions deploy).

### Bên trong làm gì (6 bước)
1. **Tạo ECR repos** `myapp-backend`, `myapp-frontend` (idempotent — bỏ qua nếu đã tồn tại)
2. **Launch EC2** với AMI/SG/subnet/IAM đã hardcode, tag `Name=myapp-ec2`, đợi `instance-running`
3. **Update Route 53** A record `vhnlong.store` và `www.vhnlong.store` → IP mới (TTL=60) + set GitHub environment secret `EC2_HOST` cho cả `production` và `staging`
4. **Đợi 60s** cho SSH daemon khởi động xong
5. **SSH vào EC2** cài: Docker + AWS CLI v2 + Certbot + lấy SSL cert từ Let's Encrypt + tạo `~/app/production` và `~/app/staging`
6. **Trigger workflow** `gh workflow run deploy.yml --ref main --field environment=production`

### Side effects
- **TẠO RESOURCES TỐN TIỀN:** EC2 (~$0.0208/hr), EBS root volume (~$0.001/hr), băng thông ECR pull lần đầu
- Update GitHub environment secrets (override giá trị cũ)
- Update Route 53 A record (override giá trị cũ)

### Troubleshooting

| Lỗi | Nguyên nhân & Fix |
|---|---|
| `InvalidAMIID.NotFound` | AMI ID đã đổi/deprecated trên region. Lookup AMI Ubuntu 22.04 mới: `aws ec2 describe-images --owners 099720109477 --filters "Name=name,Values=*ubuntu-jammy-22.04-amd64-server*" --query "sort_by(Images, &CreationDate)[-1].ImageId" --output text --region ap-southeast-1` |
| `NoSuchHostedZone` | Hosted zone đã xoá. Tạo lại trong Route 53 Console, copy zone ID mới vào `$HOSTED_ZONE_ID` |
| `Route 53 update that bai (exit code ...)` | Thường do JSON encoding. Script đã workaround bằng temp file + UTF-8 no BOM. Nếu vẫn fail: kiểm tra `aws sts get-caller-identity` |
| `gh: command not found` (sau khi đã cài) | PATH chưa refresh. Script đã có lệnh refresh PATH ở dòng 95 — nếu vẫn fail: mở PowerShell mới |
| `gh secret set ... permission denied` | Token thiếu scope. Chạy `gh auth refresh -s repo` |
| `Certbot fail: NXDOMAIN` | DNS chưa propagate đủ. Script đã đợi 60s — nếu vẫn fail: SSH vào EC2, chạy lại `sudo certbot certonly --standalone -d vhnlong.store -d www.vhnlong.store --non-interactive --agree-tos --email longvhn1999@gmail.com` |
| `LOI: Setup EC2 that bai (exit code ...)` | Script fail ở bước SSH-setup. SSH vào EC2 chạy tay từng lệnh để debug, hoặc dùng `setup-ec2.ps1 -IP <ip>` để retry chỉ phần setup |

---

## 2. evening.ps1 — Tắt hệ thống hàng ngày

### Mục đích
Huỷ toàn bộ resource tốn tiền cuối ngày. Mục tiêu: chi phí EC2 = $0 khi không học.

### Prerequisites
- AWS CLI đã cấu hình với quyền: EC2 terminate-instances + release-address, ECR delete-repository

### Hardcoded values

| Biến | Giá trị | Ghi chú |
|---|---|---|
| `$REGION` | `ap-southeast-1` | |
| EC2 tag filter | `Name=myapp-ec2` | Chỉ tìm/xoá EC2 có tag này |
| ECR repos xoá | `myapp-backend`, `myapp-frontend` | Khớp với tên dùng trong [deploy.yml](../.github/workflows/deploy.yml) |

### Cách chạy
```powershell
# Interactive (hỏi xác nhận trước khi terminate EC2)
.\scripts\evening.ps1

# Auto-confirm (dùng cho automation/scheduled task)
.\scripts\evening.ps1 -Force
```

### Bên trong làm gì (3 bước)
1. **Terminate EC2** có tag `Name=myapp-ec2` ở trạng thái `running` hoặc `stopped` (EBS gắn kèm tự xoá theo "Delete on Termination" mặc định)
2. **Xoá ECR repos** `myapp-backend` và `myapp-frontend` cùng tất cả images bên trong (`--force`)
3. **Release Elastic IPs** chưa gắn vào instance nào (Elastic IP đã gắn vào EC2 đang chạy thì miễn phí, không cần release)

### Side effects — **DESTRUCTIVE**
- **Terminate EC2 vĩnh viễn** + xoá EBS volumes (mất data Docker postgres_data nếu chưa backup)
- **Xoá ECR repos + images** (morning.ps1 sẽ tạo lại cùng tên → ECR_REGISTRY URI không đổi)
- Release Elastic IP

### KHÔNG xoá gì
- **Route 53 hosted zone** (~$0.50/tháng, giữ lại để sáng mai update IP mới)
- **GitHub Secrets** (`morning.ps1` sẽ override sang IP mới)
- **SSM Parameters** (giữ vĩnh viễn để app dùng)
- **IAM role, Security Group, key pair, Subnet** (giữ để tái sử dụng)

### Troubleshooting

| Lỗi | Nguyên nhân & Fix |
|---|---|
| `Khong co EC2 nao dang chay` | Bình thường nếu đã chạy evening trước đó. Script vẫn tiếp tục xoá ECR + Elastic IP |
| `RepositoryNotFoundException` | Bình thường — repo đã không tồn tại, script in "khong ton tai, bo qua" |
| `Elastic IP không release được` | Elastic IP đang associated với EC2 chưa terminate xong. Đợi EC2 terminate hoàn tất (1-2 phút) rồi chạy lại `evening.ps1` |
| Chi phí vẫn còn sau khi chạy | Chạy `.\scripts\cost-check.ps1` để audit — có thể còn RDS / NAT / ALB / EBS detached |

---

## 3. setup-ec2.ps1 — Khởi tạo EC2 (one-time / retry)

### Mục đích
Cài Docker + Certbot + SSL trên 1 EC2 đã có sẵn. Tách rời với `morning.ps1` để có thể retry chỉ phần setup mà không cần tạo lại EC2.

### Khi nào dùng
- Khi `morning.ps1` fail ở bước 5 (SSH-setup) và muốn retry không tạo EC2 mới
- Khi tạo EC2 thủ công qua Console và muốn cài nhanh

### Prerequisites
- EC2 đã `running` và accept SSH (port 22 trong SG)
- DNS `vhnlong.store` đã trỏ đến IP truyền vào (cho Certbot validate)
- PEM key tại `$env:USERPROFILE\.ssh\deploy-ec2.pem`

### Hardcoded values

| Biến | Giá trị |
|---|---|
| `$KEY_PATH` | `$env:USERPROFILE\.ssh\deploy-ec2.pem` |
| `$DOMAIN` | `vhnlong.store` |
| `$EMAIL` | `longvhn1999@gmail.com` |

> **Lưu ý:** PEM path KHÁC với `morning.ps1` (`E:\AWS\deploy-ec2.pem`). Nếu chỉ có 1 chỗ lưu key thì thống nhất 2 file lại.

### Cách chạy
```powershell
.\scripts\setup-ec2.ps1 -IP 13.251.123.45
```
Bắt buộc tham số `-IP`. Script đợi 30s trước khi SSH (cho instance hoàn tất boot).

### Cài gì lên EC2
- Docker (qua `get.docker.com`) + add user `ubuntu` vào nhóm docker + enable autostart
- AWS CLI v2
- Certbot + lấy SSL cert cho `vhnlong.store` + `www.vhnlong.store`
- Tạo `~/app/production` và `~/app/staging`

### Side effects
- Non-destructive trên local
- Trên EC2: cài packages, tạo SSL cert (cert lưu tại `/etc/letsencrypt/live/vhnlong.store/`)

### Troubleshooting

| Lỗi | Nguyên nhân & Fix |
|---|---|
| `ssh: connect to host ... port 22: Connection refused` | Instance chưa ready. Đợi 30-60s nữa rồi chạy lại |
| `Permission denied (publickey)` | Sai PEM key hoặc key permission. Trên Windows: `icacls $env:USERPROFILE\.ssh\deploy-ec2.pem /inheritance:r /grant:r $env:USERNAME:R` |
| `Certbot: NXDOMAIN looking up A for vhnlong.store` | DNS chưa trỏ về IP. Check Route 53 A record có khớp `-IP` không |
| `Certbot: rate limit reached` | Let's Encrypt limit 5 cert/tuần/domain. Đợi reset hoặc dùng staging cert (`--staging`) |
| Script chỉ in 1 dòng comment rồi exit 0 | Bug PowerShell 5.1 strip newlines. Script đã workaround bằng pipe qua STDIN — nếu user sửa script: giữ nguyên cú pháp `$REMOTE_SCRIPT \| ssh ... "bash -s"` |

---

## 4. cost-check.ps1 — Audit chi phí & dọn resources

### Mục đích
Interactive menu liệt kê toàn bộ AWS resources đang tốn tiền, kèm ước tính giá. Cho phép xoá thủ công từng resource.

### Prerequisites
- AWS CLI cấu hình với quyền `describe-*` (tối thiểu để liệt kê) + quyền xoá (nếu muốn dùng menu xoá)

### Resources được scan

| Type | Cost estimate |
|---|---|
| EC2 (t3.micro / t3.small / t3.medium) | ~$0.0104 / $0.0208 / $0.0416 / hr |
| EBS Volume (gp2/gp3) | ~$0.10/GB/tháng |
| RDS instance | ~$0.021/hr (db.t3.micro) |
| Elastic IP — associated | Free |
| Elastic IP — unassociated | ~$0.005/hr |
| NAT Gateway | ~$0.045/hr ⚠️ đắt nhất |
| Load Balancer (ALB/NLB) | ~$0.008/hr |
| ECR Repo | ~$0.10/GB/tháng |
| Route 53 Hosted Zone | ~$0.50/tháng |

### Cách chạy
```powershell
.\scripts\cost-check.ps1
```
Không có tham số. Sau khi liệt kê, nhập số `[No]` để chọn resource, sau đó chọn action (Stop / Terminate / Delete / Release). Nhập `q` để thoát.

### Side effects
- Đọc-only khi chỉ liệt kê (nhập `q` ngay)
- **DESTRUCTIVE** khi chọn action — luôn có prompt `Xac nhan? (y/n)` trước khi xoá thật

### Use cases điển hình
- Sáng vừa chạy `morning.ps1` xong → audit xem có resource nào "rò rỉ" từ hôm trước
- Sau khi học RDS → dùng menu để delete instance + EBS detached
- Cuối tuần → audit toàn bộ, đảm bảo về $0

### Troubleshooting

| Lỗi | Nguyên nhân & Fix |
|---|---|
| Bảng trống (`Khong co resource nao dang chay`) | Tốt — không tốn tiền. Hoặc check region: script chỉ scan `ap-southeast-1` |
| Route 53: chọn số rồi báo "xoa tren AWS Console" | Đúng hành vi — script không xoá zone vì còn DNS records. Vào Console xoá records trước, rồi xoá zone |
| `DBInstance ... can't be deleted because deletion protection is enabled` | Bật deletion protection. Vào RDS Console → Modify → Disable deletion protection → Apply immediately → chạy lại |
| EBS detached không xoá được | Snapshot/AMI tham chiếu volume. Xoá AMI/snapshot trước, hoặc dùng AWS Console |
| `LoadBalancer ... has dependencies` | ALB có Target Group/Listener. Xoá Target Group trước qua Console |

---

## 5. cleanup-frontend.ps1 — _(Planned)_ Tear down S3 + CloudFront infra

> **Status:** Script chưa tồn tại trong repo — sẽ được tạo khi thực thi Phase 4 của [S3_FRONTEND.md](S3_FRONTEND.md). Section này document trước để bạn có thể chuẩn bị.

### Mục đích
Xoá toàn bộ infra phục vụ S3 + CloudFront khi học xong: S3 bucket, CloudFront distribution, ACM certificate. Trải qua các bước phức tạp vì CloudFront cần disable trước khi delete (mất ~15 phút).

### Khi nào dùng
- Học xong CloudFront, muốn cleanup để chắc chắn không còn tốn tiền
- Migration thất bại và muốn rollback hoàn toàn (kèm với `git revert`)

### Prerequisites
- AWS CLI cấu hình với quyền: `s3:DeleteBucket`, `s3:DeleteObject`, `cloudfront:UpdateDistribution`, `cloudfront:DeleteDistribution`, `acm:DeleteCertificate`
- Phải biết **CloudFront Distribution ID** (lưu trong GitHub Secret `CLOUDFRONT_DISTRIBUTION_ID` hoặc xem trong CloudFront Console)

### Hardcoded values

| Biến | Giá trị | Sửa khi |
|---|---|---|
| `$REGION_FE` | `ap-southeast-1` | S3 bucket region |
| `$REGION_CERT` | `us-east-1` | ACM cert region (bắt buộc cho CloudFront) |
| `$BUCKET` | `vhnlong.store-fe` | Đổi tên bucket |

### Cách chạy
```powershell
.\scripts\cleanup-frontend.ps1
# Script prompt 2 lần:
#   1. Confirm tiếp tục (yes/no)
#   2. Nhập CloudFront Distribution ID
```

### Bên trong làm gì (4 bước)
1. **Empty + delete S3 bucket** — phải empty trước, dùng `aws s3 rm --recursive` + `aws s3 rb`
2. **Disable CloudFront distribution** — get current config + ETag → set `Enabled=false` → update → wait `distribution-deployed` (~15 phút)
3. **Delete CloudFront distribution** — get new ETag → delete (vài giây)
4. **Delete ACM certificate** ở us-east-1 (tự lookup ARN theo domain `vhnlong.store`)

### Side effects — **DESTRUCTIVE**
- Xoá vĩnh viễn S3 bucket + content
- Xoá vĩnh viễn CloudFront distribution → `vhnlong.store` không phục vụ được qua CDN nữa
- Xoá vĩnh viễn ACM cert → CloudFront mới không dùng được cert này

### KHÔNG tự xoá
- **Route 53** records `vhnlong.store`, `www.vhnlong.store` (alias) → cần xoá thủ công hoặc chạy lại morning.ps1 cũ để trỏ về EC2
- **GitHub Secret** `CLOUDFRONT_DISTRIBUTION_ID` → user xoá thủ công qua `gh secret delete`
- **IAM policy** `FrontendDeployPolicy` của user `github-actions-deploy` → user xoá thủ công

### Troubleshooting

| Lỗi | Nguyên nhân & Fix |
|---|---|
| `BucketNotEmpty` | S3 bucket vẫn có objects. Script đã chạy `s3 rm --recursive` — nếu vẫn fail: kiểm tra versioning có bật không, dùng `aws s3api delete-objects` với version IDs |
| Distribution disable bị treo > 30 phút | Bình thường là ~15 phút. Nếu > 30 phút: kiểm tra status qua `aws cloudfront get-distribution --id ... --query "Distribution.Status"` — nếu vẫn `InProgress`, đợi tiếp |
| `CannotDeleteEntity: The certificate is in use` | Cert vẫn associated với CloudFront. Confirm CloudFront đã delete xong (status không còn trong list) |
| Route 53 alias records không thấy ai sửa | cleanup-frontend.ps1 không tự sửa Route 53. Cần manual: xoá alias records, tạo lại A records trỏ EC2 |

---

## Bảng tóm tắt nhanh

| Script | Khi nào dùng | Destructive? | Tham số |
|---|---|---|---|
| [morning.ps1](../scripts/morning.ps1) | Mỗi sáng bắt đầu học | Tạo resources (tốn tiền) | _(không)_ |
| [evening.ps1](../scripts/evening.ps1) | Mỗi tối kết thúc | **Có** — terminate EC2, xoá ECR, release EIP | `-Force` (skip confirm) |
| [setup-ec2.ps1](../scripts/setup-ec2.ps1) | Retry khi `morning.ps1` fail SSH-setup | Không (chỉ cài lên EC2) | `-IP <ec2-ip>` _(bắt buộc)_ |
| [cost-check.ps1](../scripts/cost-check.ps1) | Audit bất kỳ lúc nào | Có (qua menu, luôn confirm) | _(không)_ |
| `cleanup-frontend.ps1` _(planned)_ | Cleanup S3/CloudFront khi học xong | **Có** — xoá vĩnh viễn S3 bucket, CloudFront, ACM cert | _(không)_ |

---

## Khi nào cần update các giá trị hardcode

Khi đổi domain / region / VPC / repo / key location, sửa các chỗ sau:

| Thay đổi | File cần sửa |
|---|---|
| Đổi region | `morning.ps1`, `evening.ps1`, `cost-check.ps1` (`$REGION`) |
| Đổi domain | `morning.ps1` (`$DOMAIN`), `setup-ec2.ps1` (`$DOMAIN`), [nginx/default.conf](../nginx/default.conf), SSM `/myapp/*/VITE_API_URL` |
| Đổi email Let's Encrypt | `morning.ps1` (`$EMAIL`), `setup-ec2.ps1` (`$EMAIL`) |
| Đổi VPC / Subnet / SG | `morning.ps1` (`$SECURITY_GROUP`, `$SUBNET_ID`) |
| Đổi IAM role | `morning.ps1` (`$IAM_PROFILE`) |
| Đổi Route 53 zone | `morning.ps1` (`$HOSTED_ZONE_ID`) |
| Đổi GitHub repo | `morning.ps1` (`$GITHUB_REPO`) |
| Đổi vị trí PEM key | `morning.ps1` (`$KEY_PATH`), `setup-ec2.ps1` (`$KEY_PATH`) |
| Đổi tên ECR repos | `evening.ps1` (mảng `@("myapp-backend", "myapp-frontend")`), [deploy.yml](../.github/workflows/deploy.yml), [docker-compose.prod.yml](../docker-compose.prod.yml) |
| Đổi tag EC2 | `evening.ps1` (filter `Name=tag:Name,Values=myapp-ec2`), `morning.ps1` (`--tag-specifications`) |

---

## Tip & Best practices

- **Trước khi chạy `morning.ps1`:** đảm bảo `evening.ps1` đã chạy thành công hôm trước (không có EC2/ECR cũ leftover)
- **Sau khi chạy `evening.ps1`:** chạy `cost-check.ps1` để confirm bảng trống → chắc chắn $0 qua đêm
- **Backup data trước khi `evening.ps1`:** Docker `postgres_data` volume bị xoá theo EC2 — nếu cần giữ data học, dump trước: `ssh ... 'docker exec myapp-production-db-1 pg_dump -U userPostgres todos_db' > backup.sql`
- **Đừng chạy `morning.ps1` 2 lần liên tiếp** mà chưa `evening.ps1` — sẽ có 2 EC2 cùng tag, không xác định được cái nào để xoá. Nếu lỡ: dùng `cost-check.ps1` chọn từng cái terminate
- **PowerShell version:** 2 scripts `morning.ps1` và `setup-ec2.ps1` đã workaround bug PowerShell 5.1 strip newlines (pipe qua STDIN). Không sửa cú pháp này.
