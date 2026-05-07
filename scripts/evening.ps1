# ============================================================
# evening.ps1 - Xoa EC2 va don dep tai nguyen cuoi ngay
# Chay: .\scripts\evening.ps1
# ============================================================

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
  $confirm = Read-Host "Xac nhan xoa? (y/n)"
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

# ─── Buoc 2: Xoa toan bo ECR images ─────────────────────────
# Muc dich: tiet kiem chi phi luu tru ECR (~$0.10/GB/thang)
# Moi sang morning.ps1 se trigger GitHub Actions build va push image moi
Write-Host ">>> Don dep ECR images cu..." -ForegroundColor Cyan
foreach ($repo in @("myapp-backend", "myapp-frontend")) {
    # Lay danh sach tat ca image digest trong repo
    $allImages = aws ecr describe-images --repository-name $repo --region $REGION `
        --query "imageDetails[*].imageDigest" --output json | ConvertFrom-Json

    if ($allImages.Count -gt 0) {
        # Tao JSON cho --cli-input-json
        # Dung temp file thay vi truyen truc tiep vi PowerShell 5.1 tu strip dau " khi truyen vao external command
        # [System.IO.File]::WriteAllText dung UTF-8 khong co BOM (AWS CLI yeu cau UTF-8 khong BOM)
        $items = $allImages | ForEach-Object { '{"imageDigest":"' + $_ + '"}' }
        $inputJson = '{"repositoryName":"' + $repo + '","imageIds":[' + ($items -join ',') + ']}'
        $tmpFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tmpFile, $inputJson)

        # Xoa tat ca images trong repo bang batch delete
        aws ecr batch-delete-image --region $REGION --cli-input-json "file://$tmpFile" | Out-Null
        Remove-Item $tmpFile -Force   # Don dep file tam

        Write-Host "  $repo : da xoa $($allImages.Count) images." -ForegroundColor Green
    } else {
        Write-Host "  $repo : khong co image nao." -ForegroundColor Gray
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
