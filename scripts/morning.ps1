# ============================================================
# morning.ps1 — Tạo EC2 mới mỗi sáng
# Chạy: .\scripts\morning.ps1
# ============================================================

$REGION         = "ap-southeast-1"
$AMI            = "ami-02dd44faa40720bb8"   # Ubuntu 22.04 LTS
$INSTANCE_TYPE  = "t3.small"
$KEY_NAME       = "deploy-ec2"              # SSH key pair name trên AWS
$SECURITY_GROUP = "sg-039475caacad36625"    # Security Group ID
$SUBNET_ID      = "subnet-046de50c5c6c52006"
$IAM_PROFILE    = "myapp-ec2-role"
$HOSTED_ZONE_ID = "Z0999500HD1JE8VHHDN2"
$DOMAIN         = "vhnlong.store"
$GITHUB_REPO    = "ngoclong99/start"        # GitHub repo để update secret EC2_HOST

Write-Host ">>> Tao EC2 moi..." -ForegroundColor Cyan

# Tạo EC2
$INSTANCE_ID = aws ec2 run-instances `
  --image-id $AMI `
  --instance-type $INSTANCE_TYPE `
  --key-name $KEY_NAME `
  --security-group-ids $SECURITY_GROUP `
  --subnet-id $SUBNET_ID `
  --iam-instance-profile Name=$IAM_PROFILE `
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=myapp-ec2}]' `
  --query "Instances[0].InstanceId" `
  --output text `
  --region $REGION

Write-Host "Instance ID: $INSTANCE_ID" -ForegroundColor Green

# Chờ EC2 running
Write-Host ">>> Cho EC2 khoi dong (60-90s)..." -ForegroundColor Yellow
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Lấy Public IP
$PUBLIC_IP = aws ec2 describe-instances `
  --instance-ids $INSTANCE_ID `
  --query "Reservations[0].Instances[0].PublicIpAddress" `
  --output text `
  --region $REGION

Write-Host "Public IP: $PUBLIC_IP" -ForegroundColor Green

# Cập nhật Route 53
Write-Host ">>> Cap nhat DNS Route 53..." -ForegroundColor Cyan
$CHANGE_BATCH = '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"' + $DOMAIN + '","Type":"A","TTL":60,"ResourceRecords":[{"Value":"' + $PUBLIC_IP + '"}]}},{"Action":"UPSERT","ResourceRecordSet":{"Name":"www.' + $DOMAIN + '","Type":"A","TTL":60,"ResourceRecords":[{"Value":"' + $PUBLIC_IP + '"}]}}]}'
aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch $CHANGE_BATCH
Write-Host "DNS da cap nhat: $DOMAIN -> $PUBLIC_IP" -ForegroundColor Green

# Cập nhật GitHub Secret EC2_HOST
Write-Host ">>> Cap nhat GitHub Secret EC2_HOST..." -ForegroundColor Cyan
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
gh secret set EC2_HOST --body $PUBLIC_IP --repo $GITHUB_REPO
Write-Host "GitHub Secret EC2_HOST = $PUBLIC_IP" -ForegroundColor Green

Write-Host ""
Write-Host "=== HOAN THANH ===" -ForegroundColor Green
Write-Host "Instance ID : $INSTANCE_ID"
Write-Host "Public IP   : $PUBLIC_IP"
Write-Host "Domain      : https://$DOMAIN"
Write-Host ""
Write-Host "Buoc tiep theo:"
Write-Host "1. Chay: .\scripts\setup-ec2.ps1 -IP $PUBLIC_IP"
Write-Host "2. Push code de deploy"
