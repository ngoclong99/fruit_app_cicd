# ============================================================
# deploy.ps1 — Tao AWS Budget canh bao chi phi qua email
# Chay: .\scripts\cost-budget\deploy.ps1
# ============================================================
#
# 1 budget = monthly $10. 3 alert threshold:
#   - 20% ($2)  -> "warning som"
#   - 50% ($5)  -> "phai chu y"
#   - 100% ($10) -> "vuot du toan, cleanup ngay"
#
# Tat ca gui email longvhn1999@gmail.com.
# Cost: $0 (2 budget dau free per account per month)

$ErrorActionPreference = "Stop"

$ACCOUNT_ID  = "529568113348"
$EMAIL       = "longvhn1999@gmail.com"
$BUDGET_NAME = "myapp-monthly-cost"
$BUDGET_USD  = "10"   # Ngan tien toi da/thang (USD)

# ─── Budget body ─────────────────────────────────────────────
# COST budget = theo USD spending. TimeUnit MONTHLY = reset moi thang.
$budget = @{
    BudgetName     = $BUDGET_NAME
    BudgetLimit    = @{ Amount = $BUDGET_USD; Unit = "USD" }
    TimeUnit       = "MONTHLY"
    BudgetType     = "COST"
    CostTypes      = @{
        IncludeTax              = $true
        IncludeSubscription     = $true
        UseBlended              = $false
        IncludeRefund           = $false
        IncludeCredit           = $false
        IncludeUpfront          = $true
        IncludeRecurring        = $true
        IncludeOtherSubscription = $true
        IncludeSupport          = $true
        IncludeDiscount         = $true
        UseAmortized            = $false
    }
} | ConvertTo-Json -Depth 10

# ─── Notification + subscribers ──────────────────────────────
# 3 threshold PERCENTAGE (vi budget = $10 nen 20/50/100% = $2/$5/$10)
# NotificationType:
#   - ACTUAL    = alert khi da chi vuot nguong
#   - FORECASTED = alert khi du bao se vuot trong thang (canh bao som)
# Dung ACTUAL cho cleanup decision -- chac chan da ton tien moi alert.
$notifications = @(
    @{
        Notification = @{
            NotificationType   = "ACTUAL"
            ComparisonOperator = "GREATER_THAN"
            Threshold          = 20
            ThresholdType      = "PERCENTAGE"
            NotificationState  = "ALARM"
        }
        Subscribers = @(@{ SubscriptionType = "EMAIL"; Address = $EMAIL })
    },
    @{
        Notification = @{
            NotificationType   = "ACTUAL"
            ComparisonOperator = "GREATER_THAN"
            Threshold          = 50
            ThresholdType      = "PERCENTAGE"
            NotificationState  = "ALARM"
        }
        Subscribers = @(@{ SubscriptionType = "EMAIL"; Address = $EMAIL })
    },
    @{
        Notification = @{
            NotificationType   = "ACTUAL"
            ComparisonOperator = "GREATER_THAN"
            Threshold          = 100
            ThresholdType      = "PERCENTAGE"
            NotificationState  = "ALARM"
        }
        Subscribers = @(@{ SubscriptionType = "EMAIL"; Address = $EMAIL })
    }
) | ConvertTo-Json -Depth 10

# Ghi ra file tam de pass qua aws CLI
$tmpBudget = [System.IO.Path]::GetTempFileName()
$tmpNotif  = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tmpBudget, $budget)
[System.IO.File]::WriteAllText($tmpNotif,  $notifications)

Write-Host "[1/2] Check budget '$BUDGET_NAME' co ton tai chua..." -ForegroundColor Cyan
# Tat $ErrorActionPreference tam thoi vi describe-budget ghi stderr khi khong co budget
$prevPref = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$existsJson = aws budgets describe-budget --account-id $ACCOUNT_ID --budget-name $BUDGET_NAME 2>&1
$ErrorActionPreference = $prevPref

if ($LASTEXITCODE -eq 0 -and $existsJson -notmatch "NotFoundException") {
    Write-Host "    Budget da co -- xoa va tao lai cho fresh config" -ForegroundColor Yellow
    aws budgets delete-budget --account-id $ACCOUNT_ID --budget-name $BUDGET_NAME | Out-Null
    Start-Sleep 3
} else {
    Write-Host "    Budget chua ton tai -- tao moi" -ForegroundColor Gray
}

Write-Host "[2/2] Tao budget + 3 notification..." -ForegroundColor Cyan
aws budgets create-budget `
    --account-id $ACCOUNT_ID `
    --budget "file://$tmpBudget" `
    --notifications-with-subscribers "file://$tmpNotif"

Remove-Item $tmpBudget -Force
Remove-Item $tmpNotif -Force

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  BUDGET TAO XONG: $BUDGET_NAME ($BUDGET_USD USD/thang)" -ForegroundColor Green
Write-Host "  Alert threshold:" -ForegroundColor Green
Write-Host "    20% = `$2.00  ACTUAL  -> $EMAIL" -ForegroundColor Green
Write-Host "    50% = `$5.00  ACTUAL  -> $EMAIL" -ForegroundColor Green
Write-Host "    100% = `$10.00 ACTUAL  -> $EMAIL" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Console: https://console.aws.amazon.com/billing/home#/budgets/overview" -ForegroundColor Cyan
Write-Host "Email se nhan ngay khi cost vuot tung muc, KHONG can confirm subscription." -ForegroundColor Cyan
Write-Host "Lan dau co the cham 8-12h vi billing data refresh moi vai gio." -ForegroundColor Cyan
