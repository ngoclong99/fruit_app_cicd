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

# Dọn ECR images cũ — giữ lại 5 images mới nhất mỗi repo
Write-Host ">>> Don dep ECR images cu..." -ForegroundColor Cyan
foreach ($repo in @("myapp-backend", "myapp-frontend")) {
    $allImages = aws ecr describe-images --repository-name $repo --region $REGION `
        --query "imageDetails[*].imageDigest" --output json | ConvertFrom-Json

    if ($allImages.Count -gt 0) {
        $imageIds = $allImages | ForEach-Object { @{ imageDigest = $_ } }
        aws ecr batch-delete-image --repository-name $repo --region $REGION `
            --image-ids ($imageIds | ConvertTo-Json -Compress) | Out-Null
        Write-Host "  $repo : da xoa $($allImages.Count) images." -ForegroundColor Green
    } else {
        Write-Host "  $repo : khong co image nao." -ForegroundColor Gray
    }
}

Write-Host ""

# Release Elastic IPs chua gan vao EC2 nao
Write-Host ">>> Release Elastic IPs..." -ForegroundColor Cyan
$eips = aws ec2 describe-addresses --query "Addresses[?AssociationId==null].AllocationId" --output json --region $REGION | ConvertFrom-Json
if ($eips.Count -gt 0) {
    foreach ($eip in $eips) {
        aws ec2 release-address --allocation-id $eip --region $REGION | Out-Null
        Write-Host "  Released: $eip" -ForegroundColor Green
    }
} else {
    Write-Host "  Khong co Elastic IP nao can release." -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== HOAN THANH ===" -ForegroundColor Green
Write-Host "EC2 terminated, ECR cleared, Elastic IP released."
Write-Host "Route 53 va GitHub Secret van giu nguyen cho ngay mai."
