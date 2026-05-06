# ============================================================
# morning.ps1 - Tao EC2 moi va deploy app tu dong
# Chay: .\scripts\morning.ps1
# ============================================================

$REGION         = "ap-southeast-1"
$AMI            = "ami-02dd44faa40720bb8"
$INSTANCE_TYPE  = "t3.small"
$KEY_NAME       = "deploy-ec2"
$SECURITY_GROUP = "sg-039475caacad36625"
$SUBNET_ID      = "subnet-046de50c5c6c52006"
$IAM_PROFILE    = "myapp-ec2-role"
$HOSTED_ZONE_ID = "Z0999500HD1JE8VHHDN2"
$DOMAIN         = "vhnlong.store"
$GITHUB_REPO    = "ngoclong99/start"
$KEY_PATH       = "E:\AWS\deploy-ec2.pem"
$EMAIL          = "longvhn1999@gmail.com"

# ─── Buoc 1: Tao EC2 ─────────────────────────────────────────
Write-Host ""
Write-Host "[1/5] Tao EC2..." -ForegroundColor Cyan
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
Write-Host "    Cho EC2 khoi dong..." -ForegroundColor Gray
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

$PUBLIC_IP = aws ec2 describe-instances `
    --instance-ids $INSTANCE_ID `
    --query "Reservations[0].Instances[0].PublicIpAddress" `
    --output text --region $REGION

Write-Host "    IP: $PUBLIC_IP" -ForegroundColor Green

# ─── Buoc 2: Cap nhat DNS va GitHub Secret ───────────────────
Write-Host "[2/5] Cap nhat Route53 DNS + GitHub Secret..." -ForegroundColor Cyan
$CHANGE = '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"' + $DOMAIN + '","Type":"A","TTL":60,"ResourceRecords":[{"Value":"' + $PUBLIC_IP + '"}]}},{"Action":"UPSERT","ResourceRecordSet":{"Name":"www.' + $DOMAIN + '","Type":"A","TTL":60,"ResourceRecords":[{"Value":"' + $PUBLIC_IP + '"}]}}]}'
aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch $CHANGE | Out-Null

$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
gh secret set EC2_HOST --env production --body $PUBLIC_IP --repo $GITHUB_REPO
gh secret set EC2_HOST --env staging   --body $PUBLIC_IP --repo $GITHUB_REPO
Write-Host "    DNS: $DOMAIN -> $PUBLIC_IP" -ForegroundColor Green

# ─── Buoc 3: Cho SSH san sang ────────────────────────────────
Write-Host "[3/5] Cho EC2 san sang SSH (60s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 60

# ─── Buoc 4: Cai Docker, Certbot, lay SSL ───────────────────
Write-Host "[4/5] Cai Docker + Certbot + SSL certificate..." -ForegroundColor Cyan

$SETUP = @"
set -e
echo '--- Cai Docker ---'
curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
sudo usermod -aG docker ubuntu
sudo systemctl enable docker --now > /dev/null 2>&1

echo '--- Cai AWS CLI ---'
curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
sudo apt-get install -y unzip > /dev/null 2>&1
unzip -q awscliv2.zip && sudo ./aws/install > /dev/null 2>&1
rm -rf aws awscliv2.zip

echo '--- Cai Certbot ---'
sudo apt-get install -y certbot > /dev/null 2>&1

echo '--- Cho DNS propagate (60s) ---'
sleep 60

echo '--- Lay SSL certificate ---'
sudo certbot certonly --standalone \
    -d $DOMAIN -d www.$DOMAIN \
    --non-interactive --agree-tos \
    --email $EMAIL

echo '--- Tao thu muc app ---'
mkdir -p ~/app/production ~/app/staging

echo 'SETUP DONE'
"@

ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP $SETUP

# ─── Buoc 5: Trigger GitHub Actions deploy ──────────────────
Write-Host "[5/5] Trigger deploy..." -ForegroundColor Cyan
gh workflow run deploy.yml --ref main --field environment=production --repo $GITHUB_REPO
Write-Host "    Workflow dang chay. Theo doi tai: https://github.com/$GITHUB_REPO/actions" -ForegroundColor Gray

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  HOAN THANH - App se san sang sau ~3 phut" -ForegroundColor Green
Write-Host "  URL: https://$DOMAIN" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
