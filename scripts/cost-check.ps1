# cost-check.ps1 - Kiem tra va quan ly AWS resources dang ton tien
# Chay: .\cost-check.ps1

$REGION = "ap-southeast-1"

function Show-Header {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor DarkGray
    Write-Host "  AWS Resources dang ton tien | Region: $REGION" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor DarkGray
    Write-Host ("{0,-5}{1,-18}{2,-38}{3,-14}{4}" -f "No", "Type", "Detail", "Status", "Cost") -ForegroundColor DarkGray
    Write-Host "-------------------------------------------------" -ForegroundColor DarkGray
}

function Show-Row($no, $type, $detail, $status, $cost) {
    $color = if ($status -match "running|available|in-use|active|associated") { "Red" } else { "Yellow" }
    Write-Host ("{0,-5}" -f "[$no]") -NoNewline -ForegroundColor White
    Write-Host ("{0,-18}" -f $type) -NoNewline -ForegroundColor White
    Write-Host ("{0,-38}" -f $detail) -NoNewline -ForegroundColor Gray
    Write-Host ("{0,-14}" -f $status) -NoNewline -ForegroundColor $color
    Write-Host $cost -ForegroundColor Yellow
}

$resources = [System.Collections.ArrayList]@()
$idx = 1

Write-Host "Dang quet AWS resources..." -ForegroundColor DarkGray

# EC2
try {
    $ec2Raw = aws ec2 describe-instances --query "Reservations[].Instances[].[InstanceId,InstanceType,State.Name,Tags[?Key=='Name'].Value|[0],PublicIpAddress]" --output json --region $REGION | ConvertFrom-Json
    foreach ($i in $ec2Raw) {
        $costMap = @{ "t3.micro"="~`$0.0104/hr"; "t3.small"="~`$0.0208/hr"; "t3.medium"="~`$0.0416/hr" }
        $c = if ($costMap[$i[1]]) { $costMap[$i[1]] } else { "~check AWS" }
        [void]$resources.Add([PSCustomObject]@{ No=$idx; Type="EC2"; ID=$i[0]; Detail="$($i[3]) | $($i[1])"; Status=$i[2]; Cost=$c; Service="ec2" })
        $idx++
    }
} catch {}

# EBS Volumes
try {
    $ebsRaw = aws ec2 describe-volumes --query "Volumes[].[VolumeId,Size,State,VolumeType,Attachments[0].InstanceId]" --output json --region $REGION | ConvertFrom-Json
    foreach ($v in $ebsRaw) {
        $c = "~`$" + [math]::Round($v[1] * 0.10 / 730, 5) + "/hr"
        [void]$resources.Add([PSCustomObject]@{ No=$idx; Type="EBS Volume"; ID=$v[0]; Detail="$($v[1])GB $($v[3])"; Status=$v[2]; Cost=$c; Service="ebs" })
        $idx++
    }
} catch {}

# RDS
try {
    $rdsRaw = aws rds describe-db-instances --query "DBInstances[].[DBInstanceIdentifier,DBInstanceClass,DBInstanceStatus,Engine]" --output json --region $REGION | ConvertFrom-Json
    foreach ($r in $rdsRaw) {
        [void]$resources.Add([PSCustomObject]@{ No=$idx; Type="RDS"; ID=$r[0]; Detail="$($r[3]) | $($r[1])"; Status=$r[2]; Cost="~`$0.021/hr"; Service="rds" })
        $idx++
    }
} catch {}

# Elastic IPs
try {
    $eipRaw = aws ec2 describe-addresses --query "Addresses[].[AllocationId,PublicIp,AssociationId]" --output json --region $REGION | ConvertFrom-Json
    foreach ($e in $eipRaw) {
        $status = if ($e[2]) { "associated" } else { "unassociated" }
        $cost   = if ($e[2]) { "Free" } else { "~`$0.005/hr" }
        [void]$resources.Add([PSCustomObject]@{ No=$idx; Type="Elastic IP"; ID=$e[0]; Detail="IP: $($e[1])"; Status=$status; Cost=$cost; Service="eip" })
        $idx++
    }
} catch {}

# NAT Gateways
try {
    $natRaw = aws ec2 describe-nat-gateways --filter "Name=state,Values=available,pending" --query "NatGateways[].[NatGatewayId,State,VpcId]" --output json --region $REGION | ConvertFrom-Json
    foreach ($n in $natRaw) {
        [void]$resources.Add([PSCustomObject]@{ No=$idx; Type="NAT Gateway"; ID=$n[0]; Detail="VPC: $($n[2])"; Status=$n[1]; Cost="~`$0.045/hr"; Service="nat" })
        $idx++
    }
} catch {}

# Load Balancers
try {
    $albRaw = aws elbv2 describe-load-balancers --query "LoadBalancers[].[LoadBalancerName,State.Code,Type,LoadBalancerArn]" --output json --region $REGION | ConvertFrom-Json
    foreach ($a in $albRaw) {
        [void]$resources.Add([PSCustomObject]@{ No=$idx; Type="Load Balancer"; ID=$a[3]; Detail="$($a[0]) | $($a[2])"; Status=$a[1]; Cost="~`$0.008/hr"; Service="alb" })
        $idx++
    }
} catch {}

# ECR Repos
try {
    $ecrRaw = aws ecr describe-repositories --query "repositories[].[repositoryName]" --output json --region $REGION | ConvertFrom-Json
    foreach ($e in $ecrRaw) {
        [void]$resources.Add([PSCustomObject]@{ No=$idx; Type="ECR Repo"; ID=$e[0]; Detail=$e[0]; Status="active"; Cost="~`$0.10/GB/mo"; Service="ecr" })
        $idx++
    }
} catch {}

# Route 53
try {
    $r53Raw = aws route53 list-hosted-zones --query "HostedZones[].[Id,Name]" --output json | ConvertFrom-Json
    foreach ($z in $r53Raw) {
        $zoneId = $z[0].Split('/')[-1]
        [void]$resources.Add([PSCustomObject]@{ No=$idx; Type="Route53 Zone"; ID=$zoneId; Detail=$z[1]; Status="active"; Cost="~`$0.50/mo"; Service="r53" })
        $idx++
    }
} catch {}

# Hien thi bang
Show-Header
if ($resources.Count -eq 0) {
    Write-Host "  Khong co resource nao dang chay." -ForegroundColor Green
} else {
    foreach ($r in $resources) {
        Show-Row $r.No $r.Type $r.Detail $r.Status $r.Cost
    }
}
Write-Host ""

# Menu xu ly
$choice = Read-Host "Nhap [No] de xu ly, 'q' de thoat"

while ($choice -ne "q" -and $choice -ne "") {
    $sel = $resources | Where-Object { $_.No -eq [int]$choice }

    if (-not $sel) {
        Write-Host "Khong tim thay so [$choice]." -ForegroundColor Red
    } else {
        Write-Host ""
        Write-Host "Da chon: [$($sel.No)] $($sel.Type) - $($sel.ID)" -ForegroundColor Cyan

        switch ($sel.Service) {
            "ec2" {
                Write-Host "  [1] Stop   [2] Terminate (xoa han)" -ForegroundColor White
                $action = Read-Host "  Chon"
                if ($action -eq "1") {
                    aws ec2 stop-instances --instance-ids $sel.ID --region $REGION | Out-Null
                    Write-Host "  EC2 dang Stop." -ForegroundColor Yellow
                } elseif ($action -eq "2") {
                    $confirm = Read-Host "  Xac nhan xoa? (y/n)"
                    if ($confirm -eq "y") {
                        aws ec2 terminate-instances --instance-ids $sel.ID --region $REGION | Out-Null
                        Write-Host "  EC2 da xoa." -ForegroundColor Red
                    }
                }
            }
            "ebs" {
                Write-Host "  [1] Xoa Volume (chi xoa duoc khi detached)" -ForegroundColor White
                $action = Read-Host "  Chon"
                if ($action -eq "1") {
                    $confirm = Read-Host "  Xac nhan? (y/n)"
                    if ($confirm -eq "y") {
                        aws ec2 delete-volume --volume-id $sel.ID --region $REGION | Out-Null
                        Write-Host "  EBS da xoa." -ForegroundColor Red
                    }
                }
            }
            "rds" {
                Write-Host "  [1] Stop (van ton storage)   [2] Delete (xoa han)" -ForegroundColor White
                $action = Read-Host "  Chon"
                if ($action -eq "1") {
                    aws rds stop-db-instance --db-instance-identifier $sel.ID --region $REGION | Out-Null
                    Write-Host "  RDS dang Stop." -ForegroundColor Yellow
                } elseif ($action -eq "2") {
                    $confirm = Read-Host "  Xac nhan xoa? (y/n)"
                    if ($confirm -eq "y") {
                        aws rds delete-db-instance --db-instance-identifier $sel.ID --skip-final-snapshot --region $REGION | Out-Null
                        Write-Host "  RDS dang xoa." -ForegroundColor Red
                    }
                }
            }
            "eip" {
                Write-Host "  [1] Release Elastic IP" -ForegroundColor White
                $action = Read-Host "  Chon"
                if ($action -eq "1") {
                    $confirm = Read-Host "  Xac nhan? (y/n)"
                    if ($confirm -eq "y") {
                        aws ec2 release-address --allocation-id $sel.ID --region $REGION | Out-Null
                        Write-Host "  Elastic IP da release." -ForegroundColor Red
                    }
                }
            }
            "nat" {
                Write-Host "  [1] Delete NAT Gateway" -ForegroundColor White
                $action = Read-Host "  Chon"
                if ($action -eq "1") {
                    $confirm = Read-Host "  Xac nhan? (y/n)"
                    if ($confirm -eq "y") {
                        aws ec2 delete-nat-gateway --nat-gateway-id $sel.ID --region $REGION | Out-Null
                        Write-Host "  NAT Gateway dang xoa." -ForegroundColor Red
                    }
                }
            }
            "alb" {
                Write-Host "  [1] Delete Load Balancer" -ForegroundColor White
                $action = Read-Host "  Chon"
                if ($action -eq "1") {
                    $confirm = Read-Host "  Xac nhan? (y/n)"
                    if ($confirm -eq "y") {
                        aws elbv2 delete-load-balancer --load-balancer-arn $sel.ID | Out-Null
                        Write-Host "  Load Balancer dang xoa." -ForegroundColor Red
                    }
                }
            }
            "ecr" {
                Write-Host "  [1] Delete ECR repo va tat ca images" -ForegroundColor White
                $action = Read-Host "  Chon"
                if ($action -eq "1") {
                    $confirm = Read-Host "  Xac nhan? (y/n)"
                    if ($confirm -eq "y") {
                        aws ecr delete-repository --repository-name $sel.ID --force --region $REGION | Out-Null
                        Write-Host "  ECR repo da xoa." -ForegroundColor Red
                    }
                }
            }
            "r53" {
                Write-Host "  Route53: xoa tren AWS Console (can xoa records truoc)." -ForegroundColor Yellow
            }
        }
    }

    Write-Host ""
    $choice = Read-Host "Nhap [No] tiep theo, 'q' de thoat"
}

Write-Host "Done." -ForegroundColor Green
