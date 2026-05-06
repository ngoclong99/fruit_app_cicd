# ============================================================
# cost-check.ps1 — Kiem tra va quan ly AWS resources dang ton tien
# Chay: .\scripts\cost-check.ps1
# ============================================================

$REGION = "ap-southeast-1"

function Write-Header($text) {
  Write-Host ""
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
  Write-Host " $text" -ForegroundColor Cyan
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
}

function Write-Row($id, $no, $type, $detail, $status, $cost) {
  $statusColor = if ($status -eq "running" -or $status -eq "available" -or $status -eq "in-use") { "Red" } else { "Yellow" }
  Write-Host ("[{0,2}] " -f $no) -NoNewline -ForegroundColor White
  Write-Host ("{0,-20}" -f $type) -NoNewline -ForegroundColor White
  Write-Host ("{0,-42}" -f $detail) -NoNewline -ForegroundColor Gray
  Write-Host ("{0,-12}" -f $status) -NoNewline -ForegroundColor $statusColor
  Write-Host ("{0}" -f $cost) -ForegroundColor Yellow
}

# ─── Thu thập tất cả resources ───────────────────────────────
$resources = @()
$index = 1

Write-Host ""
Write-Host "  Dang quet AWS resources..." -ForegroundColor DarkGray

# EC2 Instances
$ec2List = aws ec2 describe-instances `
  --query "Reservations[].Instances[].[InstanceId,InstanceType,State.Name,Tags[?Key=='Name'].Value|[0],PublicIpAddress]" `
  --output json --region $REGION | ConvertFrom-Json
foreach ($i in $ec2List) {
  $cost = switch ($i[1]) {
    "t3.micro"  { "~$0.0104/hr" }
    "t3.small"  { "~$0.0208/hr" }
    "t3.medium" { "~$0.0416/hr" }
    default     { "~check AWS" }
  }
  $resources += [PSCustomObject]@{
    No      = $index++
    Type    = "EC2"
    ID      = $i[0]
    Detail  = "$($i[3]) | $($i[1]) | IP: $($i[4])"
    Status  = $i[2]
    Cost    = $cost
    Service = "ec2"
  }
}

# EBS Volumes
$ebsList = aws ec2 describe-volumes `
  --query "Volumes[].[VolumeId,Size,State,VolumeType,Attachments[0].InstanceId]" `
  --output json --region $REGION | ConvertFrom-Json
foreach ($v in $ebsList) {
  $gbCost = [math]::Round($v[1] * 0.10 / 730, 4)
  $resources += [PSCustomObject]@{
    No      = $index++
    Type    = "EBS Volume"
    ID      = $v[0]
    Detail  = "$($v[1])GB $($v[3]) | attached: $($v[4])"
    Status  = $v[2]
    Cost    = "~`$$gbCost/hr"
    Service = "ebs"
  }
}

# RDS Instances
$rdsList = aws rds describe-db-instances `
  --query "DBInstances[].[DBInstanceIdentifier,DBInstanceClass,DBInstanceStatus,Engine]" `
  --output json --region $REGION | ConvertFrom-Json
foreach ($r in $rdsList) {
  $resources += [PSCustomObject]@{
    No      = $index++
    Type    = "RDS"
    ID      = $r[0]
    Detail  = "$($r[3]) | $($r[1])"
    Status  = $r[2]
    Cost    = "~$0.021/hr"
    Service = "rds"
  }
}

# Elastic IPs
$eipList = aws ec2 describe-addresses `
  --query "Addresses[].[AllocationId,PublicIp,AssociationId]" `
  --output json --region $REGION | ConvertFrom-Json
foreach ($e in $eipList) {
  $status = if ($e[2]) { "associated" } else { "unassociated" }
  $cost   = if ($e[2]) { "Free" } else { "~$0.005/hr" }
  $resources += [PSCustomObject]@{
    No      = $index++
    Type    = "Elastic IP"
    ID      = $e[0]
    Detail  = "IP: $($e[1])"
    Status  = $status
    Cost    = $cost
    Service = "eip"
  }
}

# NAT Gateways
$natList = aws ec2 describe-nat-gateways `
  --filter "Name=state,Values=available,pending" `
  --query "NatGateways[].[NatGatewayId,State,VpcId]" `
  --output json --region $REGION | ConvertFrom-Json
foreach ($n in $natList) {
  $resources += [PSCustomObject]@{
    No      = $index++
    Type    = "NAT Gateway"
    ID      = $n[0]
    Detail  = "VPC: $($n[2])"
    Status  = $n[1]
    Cost    = "~$0.045/hr"
    Service = "nat"
  }
}

# Load Balancers
$albList = aws elbv2 describe-load-balancers `
  --query "LoadBalancers[].[LoadBalancerArn,LoadBalancerName,State.Code,Type]" `
  --output json --region $REGION | ConvertFrom-Json
foreach ($a in $albList) {
  $resources += [PSCustomObject]@{
    No      = $index++
    Type    = "Load Balancer"
    ID      = $a[0].Split('/')[-2]
    Detail  = "$($a[1]) | $($a[3])"
    Status  = $a[2]
    Cost    = "~$0.008/hr"
    Service = "alb"
  }
}

# ECR Repositories (tính theo storage)
$ecrList = aws ecr describe-repositories `
  --query "repositories[].[repositoryName,repositoryUri]" `
  --output json --region $REGION | ConvertFrom-Json
foreach ($e in $ecrList) {
  $resources += [PSCustomObject]@{
    No      = $index++
    Type    = "ECR Repo"
    ID      = $e[0]
    Detail  = $e[1]
    Status  = "active"
    Cost    = "~$0.10/GB/mo"
    Service = "ecr"
  }
}

# Route 53 Hosted Zones
$r53List = aws route53 list-hosted-zones `
  --query "HostedZones[].[Id,Name,Config.PrivateZone]" `
  --output json | ConvertFrom-Json
foreach ($z in $r53List) {
  $type = if ($z[2]) { "Private" } else { "Public" }
  $resources += [PSCustomObject]@{
    No      = $index++
    Type    = "Route53 Zone"
    ID      = $z[0].Split('/')[-1]
    Detail  = "$($z[1]) | $type"
    Status  = "active"
    Cost    = "~$0.50/mo"
    Service = "r53"
  }
}

# ─── Hiển thị bảng ───────────────────────────────────────────
Write-Header "AWS Resources dang ton tien  |  Region: $REGION"
Write-Host ("[No] {0,-20}{1,-42}{2,-12}{3}" -f "Type", "Detail", "Status", "Est. Cost") -ForegroundColor DarkGray
Write-Host ""

if ($resources.Count -eq 0) {
  Write-Host "  Khong tim thay resource nao." -ForegroundColor Green
} else {
  foreach ($r in $resources) {
    Write-Row $r.ID $r.No $r.Type $r.Detail $r.Status $r.Cost
  }
}

Write-Host ""

# ─── Menu xử lý ──────────────────────────────────────────────
Write-Host "Nhap so [No] de xu ly, hoac 'q' de thoat: " -NoNewline -ForegroundColor White
$input = Read-Host

while ($input -ne "q" -and $input -ne "") {
  $selected = $resources | Where-Object { $_.No -eq [int]$input }

  if (-not $selected) {
    Write-Host "Khong tim thay so [$input]." -ForegroundColor Red
  } else {
    Write-Host ""
    Write-Host "Da chon: [$($selected.No)] $($selected.Type) — $($selected.ID)" -ForegroundColor Cyan

    switch ($selected.Service) {
      "ec2" {
        Write-Host "  [1] Stop EC2   [2] Terminate (xoa han) EC2" -ForegroundColor White
        $action = Read-Host "  Chon"
        if ($action -eq "1") {
          aws ec2 stop-instances --instance-ids $selected.ID --region $REGION | Out-Null
          Write-Host "  EC2 $($selected.ID) dang duoc Stop." -ForegroundColor Yellow
        } elseif ($action -eq "2") {
          $confirm = Read-Host "  Xac nhan xoa han EC2 $($selected.ID)? (y/n)"
          if ($confirm -eq "y") {
            aws ec2 terminate-instances --instance-ids $selected.ID --region $REGION | Out-Null
            Write-Host "  EC2 $($selected.ID) da duoc xoa." -ForegroundColor Red
          }
        }
      }
      "ebs" {
        Write-Host "  [1] Xoa EBS Volume (chi xoa duoc khi detached)" -ForegroundColor White
        $action = Read-Host "  Chon"
        if ($action -eq "1") {
          $confirm = Read-Host "  Xac nhan xoa Volume $($selected.ID)? (y/n)"
          if ($confirm -eq "y") {
            aws ec2 delete-volume --volume-id $selected.ID --region $REGION | Out-Null
            Write-Host "  EBS $($selected.ID) da duoc xoa." -ForegroundColor Red
          }
        }
      }
      "rds" {
        Write-Host "  [1] Stop RDS (van ton phi storage)   [2] Delete RDS (xoa han)" -ForegroundColor White
        $action = Read-Host "  Chon"
        if ($action -eq "1") {
          aws rds stop-db-instance --db-instance-identifier $selected.ID | Out-Null
          Write-Host "  RDS $($selected.ID) dang duoc Stop." -ForegroundColor Yellow
        } elseif ($action -eq "2") {
          $confirm = Read-Host "  Xac nhan xoa RDS $($selected.ID)? (y/n)"
          if ($confirm -eq "y") {
            aws rds delete-db-instance --db-instance-identifier $selected.ID --skip-final-snapshot --region $REGION | Out-Null
            Write-Host "  RDS $($selected.ID) dang duoc xoa." -ForegroundColor Red
          }
        }
      }
      "eip" {
        Write-Host "  [1] Release Elastic IP" -ForegroundColor White
        $action = Read-Host "  Chon"
        if ($action -eq "1") {
          $confirm = Read-Host "  Xac nhan release EIP $($selected.ID)? (y/n)"
          if ($confirm -eq "y") {
            aws ec2 release-address --allocation-id $selected.ID --region $REGION | Out-Null
            Write-Host "  Elastic IP da duoc release." -ForegroundColor Red
          }
        }
      }
      "nat" {
        Write-Host "  [1] Delete NAT Gateway" -ForegroundColor White
        $action = Read-Host "  Chon"
        if ($action -eq "1") {
          $confirm = Read-Host "  Xac nhan xoa NAT Gateway $($selected.ID)? (y/n)"
          if ($confirm -eq "y") {
            aws ec2 delete-nat-gateway --nat-gateway-id $selected.ID --region $REGION | Out-Null
            Write-Host "  NAT Gateway dang duoc xoa." -ForegroundColor Red
          }
        }
      }
      "alb" {
        Write-Host "  [1] Delete Load Balancer" -ForegroundColor White
        $action = Read-Host "  Chon"
        if ($action -eq "1") {
          $confirm = Read-Host "  Xac nhan xoa Load Balancer? (y/n)"
          if ($confirm -eq "y") {
            # Lấy full ARN
            $arn = aws elbv2 describe-load-balancers --query "LoadBalancers[?LoadBalancerName=='$($selected.Detail.Split('|')[0].Trim())'].LoadBalancerArn" --output text
            aws elbv2 delete-load-balancer --load-balancer-arn $arn | Out-Null
            Write-Host "  Load Balancer dang duoc xoa." -ForegroundColor Red
          }
        }
      }
      "ecr" {
        Write-Host "  [1] Delete ECR Repository va tat ca images" -ForegroundColor White
        $action = Read-Host "  Chon"
        if ($action -eq "1") {
          $confirm = Read-Host "  Xac nhan xoa ECR repo '$($selected.ID)'? (y/n)"
          if ($confirm -eq "y") {
            aws ecr delete-repository --repository-name $selected.ID --force --region $REGION | Out-Null
            Write-Host "  ECR repo da duoc xoa." -ForegroundColor Red
          }
        }
      }
      "r53" {
        Write-Host "  Route53 Hosted Zone: xoa tren AWS Console (can xoa records truoc)." -ForegroundColor Yellow
      }
    }
  }

  Write-Host ""
  Write-Host "Nhap so [No] tiep theo, hoac 'q' de thoat: " -NoNewline -ForegroundColor White
  $input = Read-Host
}

Write-Host ""
Write-Host "Tam biet!" -ForegroundColor Green
