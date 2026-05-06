# ============================================================
# evening.ps1 — Xoa EC2 cuoi ngay
# Chay: .\scripts\evening.ps1
# ============================================================

$REGION = "ap-southeast-1"

# Lấy tất cả EC2 đang chạy có tag Name=myapp-ec2
$INSTANCE_IDS = aws ec2 describe-instances `
  --filters "Name=tag:Name,Values=myapp-ec2" "Name=instance-state-name,Values=running,stopped" `
  --query "Reservations[].Instances[].InstanceId" `
  --output text `
  --region $REGION

if (-not $INSTANCE_IDS) {
  Write-Host "Khong co EC2 nao dang chay." -ForegroundColor Yellow
  exit
}

Write-Host "Tim thay EC2: $INSTANCE_IDS" -ForegroundColor Yellow
$confirm = Read-Host "Xac nhan xoa? (y/n)"
if ($confirm -ne "y") {
  Write-Host "Huy bo." -ForegroundColor Red
  exit
}

# Xóa EC2
aws ec2 terminate-instances --instance-ids $INSTANCE_IDS --region $REGION
Write-Host ">>> Dang xoa EC2: $INSTANCE_IDS" -ForegroundColor Red

Write-Host ""
Write-Host "=== HOAN THANH ===" -ForegroundColor Green
Write-Host "EC2 da duoc xoa. Chi phi dung lai."
Write-Host "Route 53 va GitHub Secret van giu nguyen cho ngay mai."
