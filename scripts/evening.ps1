# ============================================================
# evening.ps1 - Xoa EC2 va don dep tai nguyen cuoi ngay
# Chay: .\scripts\evening.ps1            (hoi xac nhan truoc khi terminate EC2)
#       .\scripts\evening.ps1 -Force     (auto confirm, dung cho automation)
# ============================================================

param(
  [switch]$Force
)

$REGION = "ap-southeast-1"

# ─── Buoc 1: Xoa EC2 ─────────────────────────────────────────
# Tim tat ca EC2 co tag Name=myapp-ec2 dang running hoac stopped
$INSTANCE_IDS = aws ec2 describe-instances `
  --filters "Name=tag:Name,Values=myapp-ec2" "Name=instance-state-name,Values=running,stopped" `
  --query "Reservations[].Instances[].InstanceId" `
  --output text `
  --region $REGION

if (-not $INSTANCE_IDS) {
  # Khong tim thay EC2 nao, bo qua buoc nay va tiep tuc don dep ECR va Elastic IP
  Write-Host "Khong co EC2 nao dang chay." -ForegroundColor Yellow
} else {
  Write-Host "Tim thay EC2: $INSTANCE_IDS" -ForegroundColor Yellow
  if ($Force) {
    $confirm = "y"
    Write-Host "  -Force flag: tu dong xac nhan terminate" -ForegroundColor Yellow
  } else {
    $confirm = Read-Host "Xac nhan xoa? (y/n)"
  }
  if ($confirm -ne "y") {
    Write-Host "Bo qua xoa EC2." -ForegroundColor Yellow
  } else {
    # Terminate EC2: xoa vinh vien, khong the phuc hoi
    # EBS volume gan kem cung se bi xoa theo (vi dung "Delete on Termination" mac dinh)
    aws ec2 terminate-instances --instance-ids $INSTANCE_IDS --region $REGION | Out-Null
    Write-Host ">>> Dang xoa EC2: $INSTANCE_IDS" -ForegroundColor Red
  }
}

Write-Host ""

# ─── Buoc 2: Xoa hoan toan ECR repos ─────────────────────────
# Truoc day chi xoa images, nhung van con repo (mien phi neu rong)
# Gio xoa luon ca repo de chac chan khong bi orphaned manifests/layers
# Morning.ps1 se tu dong tao lai repo cung ten -> ECR_REGISTRY URI khong doi
Write-Host ">>> Xoa ECR repos..." -ForegroundColor Cyan
foreach ($repo in @("myapp-backend", "myapp-frontend")) {
    # Probe xem repo co ton tai khong
    aws ecr describe-repositories --repository-names $repo --region $REGION 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        # --force: xoa repo ke ca khi van con images ben trong
        aws ecr delete-repository --repository-name $repo --region $REGION --force | Out-Null
        Write-Host "  $repo : deleted" -ForegroundColor Green
    } else {
        Write-Host "  $repo : khong ton tai, bo qua" -ForegroundColor Gray
    }
}

Write-Host ""

# ─── Buoc 3: Release Elastic IPs chua duoc su dung ───────────
# Elastic IP khong gan vao EC2 nao van bi tinh phi (~$0.005/hr)
# Elastic IP dang gan vao EC2 dang chay thi mien phi
Write-Host ">>> Release Elastic IPs..." -ForegroundColor Cyan
$eips = aws ec2 describe-addresses `
  --query "Addresses[?AssociationId==null].AllocationId" `
  --output json --region $REGION | ConvertFrom-Json

if ($eips.Count -gt 0) {
    foreach ($eip in $eips) {
        # Giai phong Elastic IP, tra lai AWS de khong bi tinh phi
        aws ec2 release-address --allocation-id $eip --region $REGION | Out-Null
        Write-Host "  Released: $eip" -ForegroundColor Green
    }
} else {
    Write-Host "  Khong co Elastic IP nao can release." -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== HOAN THANH ===" -ForegroundColor Green
Write-Host "EC2 terminated, ECR cleared, Elastic IP released."
# Route 53 va GitHub Secret giu nguyen vi:
#   - Route 53: $0.50/thang, khong dang ke, va can giu de sang mai cap nhat IP moi
#   - GitHub Secret: morning.ps1 se tu dong cap nhat EC2_HOST sang IP moi
Write-Host "Route 53 va GitHub Secret van giu nguyen cho ngay mai."
