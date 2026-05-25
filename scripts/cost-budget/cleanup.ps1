# ============================================================
# cleanup.ps1 — Xoa AWS Budget canh bao chi phi
# Chay: .\scripts\cost-budget\cleanup.ps1
# ============================================================

$ACCOUNT_ID  = "529568113348"
$BUDGET_NAME = "myapp-monthly-cost"

Write-Host "Xoa budget '$BUDGET_NAME'..." -ForegroundColor Cyan
aws budgets delete-budget --account-id $ACCOUNT_ID --budget-name $BUDGET_NAME

if ($LASTEXITCODE -eq 0) {
    Write-Host "DONE -- budget va 3 notification deleted" -ForegroundColor Green
    Write-Host "Khong con email alert nao gui ve $env:EMAIL khi cost tang" -ForegroundColor Yellow
} else {
    Write-Host "Xoa that bai -- co the budget khong ton tai" -ForegroundColor Red
}
