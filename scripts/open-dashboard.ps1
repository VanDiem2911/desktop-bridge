# open-dashboard.ps1
# Khoi dong toan bo he thong DUDI Control Center & Tu dong mo trinh duyet
# Tu dong nhan dien, cai dat dependencies va build bundle neu dem qua may moi

$ErrorActionPreference = "Continue"
$bridgeDir = if (Test-Path (Join-Path $PSScriptRoot "dashboard")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent }
$dashboardDir = Join-Path $bridgeDir "dashboard"
$port = 3000
$url = "http://127.0.0.1:$port"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   DUDI NEXT.JS CONTROL CENTER DASHBOARD         " -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Kiem tra Node.js tren may
$nodeVer = try { & node -v } catch { $null }
if (-not $nodeVer) {
    Write-Host "[LOI NGUY HIEM] May nay chua cai dat Node.js!" -ForegroundColor Red
    Write-Host "Vui long tai va cai Node.js LTS tai: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Nhan Enter de thoat..."
    exit 1
}
Write-Host "[OK] Node.js da san sang ($nodeVer)" -ForegroundColor Green

# 2. Kiem tra node_modules trong bridge va dashboard
$rootModules = Join-Path $bridgeDir "node_modules"
if (-not (Test-Path $rootModules)) {
    Write-Host "`n-> Dang cai dat dependencies cho Bridge Server (express, playwright-core)..." -ForegroundColor Yellow
    Push-Location $bridgeDir
    & npm install
    Pop-Location
}

$dashModules = Join-Path $dashboardDir "node_modules"
if (-not (Test-Path $dashModules)) {
    Write-Host "`n-> Dang cai dat dependencies cho Dashboard..." -ForegroundColor Yellow
    Push-Location $dashboardDir
    & npm install
    Pop-Location
}

# 3. Kiem tra production build .next
$nextBuild = Join-Path $dashboardDir ".next"
if (-not (Test-Path $nextBuild)) {
    Write-Host "`n-> Dang build Next.js Dashboard Bundle (lan dau tren may moi)..." -ForegroundColor Yellow
    Push-Location $dashboardDir
    & npm run build
    Pop-Location
}

# 4. Kiem tra va khoi dong cac Bridge Server (3000, 3001, 3002, 3003)
$isListening = netstat -ano | Select-String ":$port\s.*LISTENING"
if (-not $isListening) {
    Write-Host "`n-> Dang khoi dong toan bo cac Bridge Servers..." -ForegroundColor Green
    $vbs = if (Test-Path (Join-Path $PSScriptRoot "run-hidden.vbs")) { Join-Path $PSScriptRoot "run-hidden.vbs" } else { Join-Path $bridgeDir "scripts\run-hidden.vbs" }
    Start-Process wscript -ArgumentList "`"$vbs`"" -WindowStyle Hidden

    # Cho server khoi dong
    $deadline = (Get-Date).AddSeconds(15)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 1000
        $isListening = netstat -ano | Select-String ":$port\s.*LISTENING"
        if ($isListening) { break }
    }
} else {
    Write-Host "[OK] Dashboard da dang chay san tren Cong $port." -ForegroundColor Green
}

# 5. Mo Dashboard tren trinh duyet
Write-Host "`n-> Dang mo giao dien Dashboard tren trinh duyet..." -ForegroundColor Cyan
Start-Process $url

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "[HOAN TAT] Dashboard da san sang tai: $url" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
