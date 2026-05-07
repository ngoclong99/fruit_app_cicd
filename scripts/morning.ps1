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
$GITHUB_REPO    = "ngoclong99/start"
$KEY_PATH       = "E:\AWS\deploy-ec2.pem"  # Duong dan den private key SSH tren may local
$EMAIL          = "longvhn1999@gmail.com"

# ─── Buoc 1: Tao EC2 ─────────────────────────────────────────
Write-Host ""
Write-Host "[1/5] Tao EC2..." -ForegroundColor Cyan

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

# ─── Buoc 2: Cap nhat DNS va GitHub Secret ───────────────────
Write-Host "[2/5] Cap nhat Route53 DNS + GitHub Secret..." -ForegroundColor Cyan

# Tao JSON body cho lenh cap nhat Route 53 DNS
# UPSERT: tao moi neu chua co, cap nhat neu da co
# TTL=60: DNS cache het han sau 60 giay (nhanh chong cap nhat khi IP doi)
$CHANGE = '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"' + $DOMAIN + '","Type":"A","TTL":60,"ResourceRecords":[{"Value":"' + $PUBLIC_IP + '"}]}},{"Action":"UPSERT","ResourceRecordSet":{"Name":"www.' + $DOMAIN + '","Type":"A","TTL":60,"ResourceRecords":[{"Value":"' + $PUBLIC_IP + '"}]}}]}'
aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch $CHANGE | Out-Null

# Lam moi PATH de dam bao lenh gh tim duoc trong phien hien tai
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")

# Cap nhat EC2_HOST trong GitHub Environment Secrets (ca production va staging)
# Phai dung --env vi deploy.yml chay trong GitHub Environment, uu tien environment secret hon repository secret
gh secret set EC2_HOST --env production --body $PUBLIC_IP --repo $GITHUB_REPO
gh secret set EC2_HOST --env staging   --body $PUBLIC_IP --repo $GITHUB_REPO

Write-Host "    DNS: $DOMAIN -> $PUBLIC_IP" -ForegroundColor Green

# ─── Buoc 3: Cho SSH san sang ────────────────────────────────
# EC2 can them ~60 giay sau khi "running" de SSH daemon khoi dong xong
Write-Host "[3/5] Cho EC2 san sang SSH (60s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 60

# ─── Buoc 4: Cai Docker, Certbot, lay SSL ───────────────────
Write-Host "[4/5] Cai Docker + Certbot + SSL certificate..." -ForegroundColor Cyan

# Script nay se duoc chay TREN EC2 qua SSH
$SETUP = @"
set -e

echo '--- Cai Docker ---'
# Tai va chay script cai dat Docker chinh thuc tu docker.com
curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
# Them user ubuntu vao nhom docker de chay docker khong can sudo
sudo usermod -aG docker ubuntu
# Bat Docker tu dong khoi dong khi EC2 reboot
sudo systemctl enable docker --now > /dev/null 2>&1

echo '--- Cai AWS CLI ---'
# Tai AWS CLI v2 cho Linux x86_64
curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
sudo apt-get install -y unzip > /dev/null 2>&1
# Giai nen va cai dat AWS CLI
unzip -q awscliv2.zip && sudo ./aws/install > /dev/null 2>&1
# Don dep file tam sau khi cai xong
rm -rf aws awscliv2.zip

echo '--- Cai Certbot ---'
# Certbot la cong cu lay SSL certificate mien phi tu Let's Encrypt
sudo apt-get install -y certbot > /dev/null 2>&1

echo '--- Cho DNS propagate (60s) ---'
# Doi Route 53 cap nhat lan ra cac DNS server toan cau truoc khi lay cert
# Certbot can xac minh domain qua DNS de cap certificate
sleep 60

echo '--- Lay SSL certificate ---'
# --standalone: Certbot tu chay web server tam thoi tren port 80 de xac minh domain
# --non-interactive: Khong hoi gi, tu dong thuc hien
# --agree-tos: Dong y dieu khoan su dung cua Let's Encrypt
sudo certbot certonly --standalone \
    -d $DOMAIN -d www.$DOMAIN \
    --non-interactive --agree-tos \
    --email $EMAIL

echo '--- Tao thu muc app ---'
# Tao thu muc rieng cho tung moi truong
# GitHub Actions se deploy code vao dung thu muc nay
mkdir -p ~/app/production ~/app/staging

echo 'SETUP DONE'
"@

# Chay script tren EC2 qua SSH
# -o StrictHostKeyChecking=no: tu dong chap nhan host key moi, khong hoi
ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP $SETUP

# ─── Buoc 5: Trigger GitHub Actions deploy ──────────────────
Write-Host "[5/5] Trigger deploy..." -ForegroundColor Cyan

# Chay workflow deploy.yml tren branch main (se deploy vao environment production)
gh workflow run deploy.yml --ref main --field environment=production --repo $GITHUB_REPO
Write-Host "    Workflow dang chay. Theo doi tai: https://github.com/$GITHUB_REPO/actions" -ForegroundColor Gray

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  HOAN THANH - App se san sang sau ~3 phut" -ForegroundColor Green
Write-Host "  URL: https://$DOMAIN" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
