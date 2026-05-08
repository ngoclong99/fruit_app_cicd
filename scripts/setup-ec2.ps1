# ============================================================
# setup-ec2.ps1 — Cài docker, certbot, SSL trên EC2 mới
# Chạy: .\scripts\setup-ec2.ps1 -IP 13.x.x.x
# ============================================================

param(
  [Parameter(Mandatory=$true)]
  [string]$IP
)

$KEY_PATH = "$env:USERPROFILE\.ssh\deploy-ec2.pem"  # Đường dẫn SSH key trên máy local
$DOMAIN   = "vhnlong.store"
$EMAIL    = "longvhn1999@gmail.com"

Write-Host ">>> SSH vao EC2 $IP va cai dat..." -ForegroundColor Cyan
Write-Host "Cho 30s de SSH san sang..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Script chạy trên EC2
$REMOTE_SCRIPT = @"
set -e

echo '=== Cai Docker ==='
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
sudo systemctl enable docker
sudo systemctl start docker

echo '=== Cai AWS CLI ==='
curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
sudo apt-get install -y unzip
unzip -q awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip

echo '=== Cai Certbot ==='
sudo apt-get update -q
sudo apt-get install -y certbot

echo '=== Lay SSL Certificate ==='
sudo certbot certonly --standalone \
  -d $DOMAIN -d www.$DOMAIN \
  --non-interactive \
  --agree-tos \
  --email $EMAIL

echo '=== Tao thu muc app ==='
mkdir -p ~/app/production ~/app/staging

echo '=== DONE ==='
echo "EC2 san sang tai: https://$DOMAIN"
"@

# SSH vào EC2 và chạy script
# Pipe qua STDIN den 'bash -s' (KHONG dung argv) vi PowerShell 5.1 strip newlines
# khien bash thay script tren 1 dong -> comment '#' an het cac lenh phia sau
$REMOTE_SCRIPT | ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$IP "bash -s"

if ($LASTEXITCODE -ne 0) {
    Write-Host "LOI: Setup that bai (exit code $LASTEXITCODE)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== EC2 DA SAN SANG ===" -ForegroundColor Green
Write-Host "Buoc tiep theo: push code de trigger GitHub Actions deploy"
