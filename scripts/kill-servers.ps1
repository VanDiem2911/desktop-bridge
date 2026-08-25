# kill-servers.ps1
# Dung (kill) toan bo cac tien trinh dang chay tren Port 3000, 3001, 3002 va 3003

$ports = @(3000, 3001, 3002, 3003)

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   DANG DUNG (KILL) TOAN BO 4 SERVERS BRIDGE...  " -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan

$killedAny = $false
foreach ($p in $ports) {
    $lines = netstat -ano | Select-String ":$p\s.*LISTENING"
    foreach ($line in $lines) {
        $parts = ($line.ToString().Trim() -split '\s+')
        $procId = $parts[-1]
        if ($procId -match '^\d+$') {
            try {
                Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
                Write-Host "-> Da dung tien trinh PID $procId tren Port $p" -ForegroundColor Green
                $killedAny = $true
            } catch {}
        }
    }
}

if (-not $killedAny) {
    Write-Host "Khong co server bridge nao dang chay tren cac cong 3001, 3002, 3003." -ForegroundColor Gray
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   HOAN TAT! CA 3 SERVERS DA DUOC TAT SACH.     " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
