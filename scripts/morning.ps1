# ============================================================
# morning.ps1 - Tao EC2 moi va deploy app tu dong
# Chay: .\scripts\morning.ps1
# ============================================================

$REGION         = "ap-southeast-1"
$AMI            = "ami-02dd44faa40720bb8"   # Ubuntu 22.04 LTS (ap-southeast-1)
$INSTANCE_TYPE  = "t3.small"                # 2 vCPU, 2GB RAM (~$0.0208/hr)
$KEY_NAME       = "deploy-ec2"              # Ten key pair da tao tren AWS
$SECURITY_GROUP = "sg-039475caacad36625"    # SG mo port 22, 80, 443
$SUBNET_ID      = "subnet-046de50c5c6c52006"
$IAM_PROFILE    = "myapp-ec2-role"          # Role cho phep EC2 truy cap ECR va SSM
$HOSTED_ZONE_ID = "Z0999500HD1JE8VHHDN2"   # Route 53 hosted zone cua vhnlong.store
$DOMAIN         = "vhnlong.store"
$GITHUB_REPO    = "ngoclong99/fruit_app_cicd"
$KEY_PATH       = "E:\AWS\deploy-ec2.pem"  # Duong dan den private key SSH tren may local
$EMAIL          = "longvhn1999@gmail.com"

# ─── Buoc 1: Tao ECR repos (idempotent) ─────────────────────
# Evening script xoa toan bo ECR repos de tiet kiem chi phi
# (~$0.10/GB/thang, du nho nhung tich luy va co the bi orphaned manifests)
# Morning tao lai voi cung ten -> GitHub Secret ECR_REGISTRY khong can update
# vi URI registry o cap account khong doi: <account>.dkr.ecr.<region>.amazonaws.com
Write-Host ""
Write-Host "[1/6] Tao ECR repos..." -ForegroundColor Cyan

foreach ($repo in @("myapp-backend", "myapp-frontend")) {
    # Probe xem repo da ton tai chua (stderr -> null de khong gay nhieu output)
    aws ecr describe-repositories --repository-names $repo --region $REGION 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        # Repo chua co -> tao moi
        # scanOnPush=false: tat tu dong scan vulnerability (mien phi nhung khong can cho demo)
        aws ecr create-repository `
            --repository-name $repo `
            --region $REGION `
            --image-scanning-configuration scanOnPush=false | Out-Null
        Write-Host "    Created: $repo" -ForegroundColor Green
    } else {
        Write-Host "    Exists:  $repo" -ForegroundColor Gray
    }
}

# ─── Buoc 2: Tao EC2 ─────────────────────────────────────────
Write-Host "[2/6] Tao EC2..." -ForegroundColor Cyan

# Khoi tao EC2 instance moi voi cac tham so da dinh nghia
$INSTANCE_ID = aws ec2 run-instances `
    --image-id $AMI `
    --instance-type $INSTANCE_TYPE `
    --key-name $KEY_NAME `
    --security-group-ids $SECURITY_GROUP `
    --subnet-id $SUBNET_ID `
    --iam-instance-profile Name=$IAM_PROFILE `
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=myapp-ec2}]' `
    --query "Instances[0].InstanceId" `
    --output text --region $REGION

Write-Host "    Instance: $INSTANCE_ID" -ForegroundColor Gray

# Cho den khi EC2 chuyen sang trang thai "running" (co the mat 1-2 phut)
Write-Host "    Cho EC2 khoi dong..." -ForegroundColor Gray
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Lay Public IP cua EC2 vua tao
$PUBLIC_IP = aws ec2 describe-instances `
    --instance-ids $INSTANCE_ID `
    --query "Reservations[0].Instances[0].PublicIpAddress" `
    --output text --region $REGION

Write-Host "    IP: $PUBLIC_IP" -ForegroundColor Green

# ─── Buoc 3: Cap nhat DNS va GitHub Secret ───────────────────
Write-Host "[3/6] Cap nhat Route53 DNS + GitHub Secret..." -ForegroundColor Cyan

# Tao JSON body cho lenh cap nhat Route 53 DNS
# UPSERT: tao moi neu chua co, cap nhat neu da co
# TTL=60: DNS cache het han sau 60 giay (nhanh chong cap nhat khi IP doi)
#
# QUAN TRONG: phai ghi JSON ra TEMP FILE va dung file:// thay vi truyen inline
# Vi PowerShell 5.1 strip dau " khi pass JSON qua argv cua native command (aws CLI)
# -> AWS CLI nhan JSON khong co quotes -> ParamValidation error -> DNS khong update
$CHANGE = '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"' + $DOMAIN + '","Type":"A","TTL":60,"ResourceRecords":[{"Value":"' + $PUBLIC_IP + '"}]}},{"Action":"UPSERT","ResourceRecordSet":{"Name":"www.' + $DOMAIN + '","Type":"A","TTL":60,"ResourceRecords":[{"Value":"' + $PUBLIC_IP + '"}]}}]}'
$tmpJson = [System.IO.Path]::GetTempFileName()
# WriteAllText dung UTF-8 khong BOM (AWS CLI yeu cau)
[System.IO.File]::WriteAllText($tmpJson, $CHANGE)
aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch "file://$tmpJson" | Out-Null
$dnsExitCode = $LASTEXITCODE
Remove-Item $tmpJson -Force
if ($dnsExitCode -ne 0) {
    Write-Host "    LOI: Route 53 update that bai (exit code $dnsExitCode)" -ForegroundColor Red
    exit 1
}

# Lam moi PATH de dam bao lenh gh tim duoc trong phien hien tai
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")

# Cap nhat EC2_HOST trong GitHub Environment Secrets (ca production va staging)
# Phai dung --env vi deploy.yml chay trong GitHub Environment, uu tien environment secret hon repository secret
gh secret set EC2_HOST --env production --body $PUBLIC_IP --repo $GITHUB_REPO
gh secret set EC2_HOST --env staging   --body $PUBLIC_IP --repo $GITHUB_REPO

Write-Host "    DNS: $DOMAIN -> $PUBLIC_IP" -ForegroundColor Green

# ─── Buoc 4: Cho SSH san sang ────────────────────────────────
# EC2 can them ~60 giay sau khi "running" de SSH daemon khoi dong xong
Write-Host "[4/6] Cho EC2 san sang SSH (60s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 60

# ─── Buoc 5: Cai Docker, Certbot, lay SSL ───────────────────
Write-Host "[5/6] Cai Docker + Certbot + SSL certificate..." -ForegroundColor Cyan

# Script nay se duoc chay TREN EC2 qua SSH.
# Idempotent: re-run an toan neu Docker/AWS CLI/certbot da cai san.
# KHONG silence stdout/stderr cua cac lenh install -- truoc day silent fail
# (vd: apt lock van bi unattended-upgrades giu) khien script lan dau the la xong,
# nhung Docker/AWS thuc te chua cai duoc.
$SETUP = @"
set -e

# Cho dpkg lock duoc free (unattended-upgrades giu lock 1-3 phut sau khi EC2 boot)
wait_apt() {
  for i in {1..60}; do
    if ! sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 \
       && ! sudo fuser /var/lib/apt/lists/lock >/dev/null 2>&1; then
      return 0
    fi
    echo "  apt locked, waiting... (\$i/60)"
    sleep 5
  done
  echo "ERROR: apt lock van bi giu sau 5 phut"
  return 1
}

echo '--- Cho apt lock + update package list ---'
wait_apt
sudo apt-get update -y

echo '--- Cai Docker ---'
if command -v docker >/dev/null 2>&1; then
  echo "  docker da co: \$(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker ubuntu
  sudo systemctl enable docker --now
fi

echo '--- Cai AWS CLI ---'
if command -v aws >/dev/null 2>&1; then
  echo "  aws da co: \$(aws --version)"
else
  wait_apt
  sudo apt-get install -y unzip
  curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
  unzip -q awscliv2.zip
  sudo ./aws/install
  rm -rf aws awscliv2.zip
fi

echo '--- Cai Certbot ---'
if command -v certbot >/dev/null 2>&1; then
  echo "  certbot da co: \$(certbot --version)"
else
  wait_apt
  sudo apt-get install -y certbot
fi

echo '--- Lay SSL certificate ---'
# Skip neu cert da ton tai (idempotent + tranh hit rate limit Let's Encrypt)
if sudo test -d /etc/letsencrypt/live/$DOMAIN; then
  echo "  cert da co cho $DOMAIN"
else
  echo "  cho DNS propagate (60s) truoc khi xin cert..."
  sleep 60
  # --standalone: certbot chay web server tam tren port 80 de verify domain
  sudo certbot certonly --standalone \
    -d $DOMAIN -d www.$DOMAIN \
    --non-interactive --agree-tos \
    --email $EMAIL
fi

echo '--- Tao thu muc app ---'
mkdir -p ~/app/production ~/app/staging

echo 'SETUP DONE'
"@

# Chay script tren EC2 qua SSH
# -o StrictHostKeyChecking=no: tu dong chap nhan host key moi, khong hoi
# QUAN TRONG: pipe script qua STDIN den 'bash -s', KHONG truyen qua argv
# Vi PowerShell 5.1 strip newlines khi pass multi-line string qua argv
# -> bash thay script tren 1 dong -> comment '#' an het script -> docker khong cai duoc
$SETUP | ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP "bash -s"

# Fail-fast: neu setup tren EC2 loi thi dung luon, dung trigger deploy (deploy se loi vi khong co docker)
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "LOI: Setup EC2 that bai (exit code $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "Kiem tra log o tren de biet buoc nao loi (Docker / AWS CLI / Certbot)" -ForegroundColor Yellow
    Write-Host "Goi y: SSH vao EC2 chay tay tung lenh de debug:" -ForegroundColor Yellow
    Write-Host "  ssh -i $KEY_PATH ubuntu@$PUBLIC_IP" -ForegroundColor Yellow
    exit 1
}

# ─── Buoc 6: Trigger GitHub Actions deploy ──────────────────
Write-Host "[6/6] Trigger deploy..." -ForegroundColor Cyan

# Chay workflow deploy.yml tren branch main (se deploy vao environment production)
gh workflow run deploy.yml --ref main --field environment=production --repo $GITHUB_REPO
Write-Host "    Workflow dang chay. Theo doi tai: https://github.com/$GITHUB_REPO/actions" -ForegroundColor Gray

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  HOAN THANH - App se san sang sau ~3 phut" -ForegroundColor Green
Write-Host "  URL: https://$DOMAIN" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
