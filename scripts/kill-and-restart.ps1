# kill-and-restart.ps1
# Dung va khoi dong lai toan bo 4 Server (Next.js 3000, Fanpage 3001, Groups 3002, Personal 3003)

$servers = @(
    @{ Port = 3000; File = 'server.mjs';          Name = 'Next.js Control Center Dashboard' },
    @{ Port = 3001; File = 'server.mjs';          Name = 'Server 1 (Fanpage & ChatGPT Xen Ke)' },
    @{ Port = 3002; File = 'group-server.mjs';    Name = 'Server 2 (Facebook Groups)' },
    @{ Port = 3003; File = 'personal-server.mjs'; Name = 'Server 3 (Facebook Ca Nhan & ChatGPT)' }
)

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   DANG DUNG (KILL) CAC PROCESS DANG CHAY...     " -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan

foreach ($srv in $servers) {
    $p = $srv.Port
    $lines = netstat -ano | Select-String ":$p\s.*LISTENING"
    foreach ($line in $lines) {
        $parts = ($line.ToString().Trim() -split '\s+')
        $procId = $parts[-1]
        if ($procId -match '^\d+$') {
            try {
                Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
                Write-Host "-> Da dung tien trinh PID $procId tren Port $p ($($srv.Name))" -ForegroundColor Yellow
            } catch {}
        }
    }
}

Start-Sleep -Seconds 2

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "   KHOI DONG LAI TOAN BO 4 SERVERS...            " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Kiem tra va build production bundle Next.js Dashboard
$bridgeDir = if (Test-Path (Join-Path $PSScriptRoot "dashboard")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent }
$dashDir = Join-Path $bridgeDir "dashboard"

Write-Host "-> Dang build Next.js Dashboard Bundle de cap nhat code moi nhat..." -ForegroundColor Yellow
Push-Location $dashDir
& npm run build
Pop-Location

$vbs = if (Test-Path (Join-Path $PSScriptRoot "run-hidden.vbs")) { Join-Path $PSScriptRoot "run-hidden.vbs" } else { Join-Path $bridgeDir "scripts\run-hidden.vbs" }
Start-Process wscript -ArgumentList "`"$vbs`"" -WindowStyle Hidden
Write-Host "-> Da khoi dong ca 4 Servers qua Windows Script Host (Hidden & Detached)..." -ForegroundColor Green

Start-Sleep -Seconds 6

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "   TRANG THAI CAC SERVERS HIEN TAI:             " -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan

foreach ($srv in $servers) {
    $p = $srv.Port
    $check = netstat -ano | Select-String ":$p\s.*LISTENING"
    if ($check) {
        Write-Host " [OK] $($srv.Name) - Port $p DANG CHAY!" -ForegroundColor Green
    } else {
        Write-Host " [ERR] $($srv.Name) - Port $p CHUA CHAY (Kiem tra log)." -ForegroundColor Red
    }
}
Write-Host "=================================================" -ForegroundColor Cyan
Start-Process "http://127.0.0.1:3000"

