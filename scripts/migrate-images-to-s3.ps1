# ============================================================
# migrate-images-to-s3.ps1
# One-shot: download tat ca anh unsplash trong mockData.ts,
# upload len S3, sinh mapping URL cu -> URL CloudFront,
# update mockData.ts, va in SQL UPDATE statements cho prod DB.
# Chay: .\scripts\migrate-images-to-s3.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$BUCKET     = "vhnlong-images"
$CDN_BASE   = "https://d2dmcrgjyyacvu.cloudfront.net"
$REGION     = "ap-southeast-1"
$MOCK_PATH  = "$PSScriptRoot\..\backend\src\data\mockData.ts"
$TMP_DIR    = "$env:TEMP\s3-migrate-$(Get-Random)"

New-Item -ItemType Directory -Path $TMP_DIR | Out-Null

Write-Host "[1/4] Doc mockData.ts va extract URLs..." -ForegroundColor Cyan
$content = Get-Content -Raw -Path $MOCK_PATH
# Tach moi URL unsplash duy nhat (dau "https://images.unsplash.com/..." den dau ")
$urlPattern = '(https://images\.unsplash\.com/[^''""]+)'
$urls = [regex]::Matches($content, $urlPattern) | ForEach-Object { $_.Value } | Select-Object -Unique
Write-Host "    Tim thay $($urls.Count) URL unique" -ForegroundColor Gray

Write-Host "[2/4] Download + upload tung anh len S3..." -ForegroundColor Cyan
$mapping = @{}
$i = 0
foreach ($url in $urls) {
    $i++
    # Sinh key on dinh: hash 8 ky tu dau cua URL goc -> tranh trung lap khi re-run
    $hash = [System.Security.Cryptography.SHA1]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($url))
    $shortId = ([System.BitConverter]::ToString($hash) -replace '-', '').Substring(0, 12).ToLower()
    $key = "products/seed-$shortId.jpg"
    $localFile = "$TMP_DIR\$shortId.jpg"

    Write-Host "    [$i/$($urls.Count)] $shortId" -ForegroundColor Gray
    Invoke-WebRequest -Uri $url -OutFile $localFile -UseBasicParsing | Out-Null
    aws s3 cp $localFile "s3://$BUCKET/$key" --region $REGION --content-type "image/jpeg" --no-progress | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "S3 upload failed cho $url" }

    $newUrl = "$CDN_BASE/$key"
    $mapping[$url] = $newUrl
}

Write-Host "[3/4] Update mockData.ts..." -ForegroundColor Cyan
$newContent = $content
foreach ($oldUrl in $mapping.Keys) {
    $newContent = $newContent.Replace($oldUrl, $mapping[$oldUrl])
}
Set-Content -Path $MOCK_PATH -Value $newContent -NoNewline -Encoding UTF8
Write-Host "    mockData.ts da update" -ForegroundColor Green

Write-Host "[4/4] Sinh SQL UPDATE cho prod DB..." -ForegroundColor Cyan
$sqlPath = "$PSScriptRoot\..\backend\sql\migrate-images-s3.sql"
$sqlDir = Split-Path $sqlPath
if (-not (Test-Path $sqlDir)) { New-Item -ItemType Directory -Path $sqlDir | Out-Null }
$sql = @()
$sql += "-- Migrate product images tu unsplash sang CloudFront/S3"
$sql += "-- Tao boi scripts/migrate-images-to-s3.ps1 ngay $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$sql += "BEGIN;"
foreach ($oldUrl in $mapping.Keys) {
    $newUrl = $mapping[$oldUrl]
    $sql += "UPDATE products SET image = '$newUrl' WHERE image = '$oldUrl';"
    $sql += "UPDATE products SET images = REPLACE(images::text, '$oldUrl', '$newUrl')::jsonb WHERE images::text LIKE '%$oldUrl%';"
}
$sql += "COMMIT;"
Set-Content -Path $sqlPath -Value ($sql -join "`n") -Encoding UTF8
Write-Host "    SQL: $sqlPath" -ForegroundColor Green

# Cleanup tmp
Remove-Item -Recurse -Force $TMP_DIR

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Migration xong: $($urls.Count) anh -> S3" -ForegroundColor Green
Write-Host "  mockData.ts: updated" -ForegroundColor Green
Write-Host "  SQL prod DB: backend/sql/migrate-images-s3.sql" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
