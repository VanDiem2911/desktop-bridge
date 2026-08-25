# update-npx-hook.ps1
# Cap nhat hook trong PowerShell profile:
# - npx n8n bat ca 2 server (ChatGPT/Page port 3001 + Group port 3002)
# - Khi n8n tat thi ca 2 server cung tu dong tat theo
# - npx n8n bat ca 3 server (ChatGPT/Page port 3001, Group port 3002, Personal port 3003)
# - Khi n8n tat thi ca 3 server cung tu dong tat theo

$dir = $PSScriptRoot

$hookCode = @"

# === n8n bridge auto-start ===
`$_npxReal = (Get-Command npx.cmd -ErrorAction SilentlyContinue)
if (-not `$_npxReal) { `$_npxReal = Get-Command npx -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1 }
`$_npxPath = if (`$_npxReal) { `$_npxReal.Source } else { 'npx.cmd' }

function npx {
    if (`$args[0] -eq 'n8n') {
        `$dashBridgeProcess = `$null
        `$bridgeProcess = `$null
        `$groupBridgeProcess = `$null
        `$personalBridgeProcess = `$null

        # Tu dong tim thu muc desktop-bridge tu vi tri dang mo terminal (Dynamic Project Path)
        `$currentLoc = (Get-Location).Path
        `$searchPaths = @(
            (Join-Path `$currentLoc 'desktop-bridge'),
            (Join-Path `$currentLoc '..\desktop-bridge'),
            (Join-Path (Split-Path `$currentLoc -Parent) 'desktop-bridge'),
            `$currentLoc
        )
        `$bridgeDir = `$searchPaths | Where-Object { Test-Path (Join-Path `$_ 'server.mjs') } | Select-Object -First 1

        if (-not `$bridgeDir) {
            # Fallback ve thu muc goc neu khong tim thay
            `$bridgeDir = '$dir'
        }

        # Kill sach cac process cu tren 3000, 3001, 3002, 3003 de dam bao luon chay code moi nhat
        @(3000, 3001, 3002, 3003) | ForEach-Object {
            `$p = `$_
            `$lines = netstat -ano | Select-String ":`$p\s.*LISTENING"
            foreach (`$line in `$lines) {
                `$parts = (`$line.ToString().Trim() -split '\s+')
                `$procId = `$parts[-1]
                if (`$procId -match '^\d+$') {
                    Stop-Process -Id ([int]`$procId) -Force -ErrorAction SilentlyContinue
                }
            }
        }

        Write-Host '[bridge] Dang khoi dong Dashboard va 3 Bridge Servers (Port 3000, 3001, 3002, 3003)...' -ForegroundColor Cyan

        # 0. Bat Next.js Dashboard Control Center (Port 3000)
        `$dashDir = Join-Path `$bridgeDir 'dashboard'
        `$dashServerFile = Join-Path `$dashDir 'server.mjs'
        if (Test-Path `$dashServerFile) {
            `$dashBridgeProcess = Start-Process -FilePath node -ArgumentList 'server.mjs' -WorkingDirectory `$dashDir -PassThru -WindowStyle Hidden
            Write-Host '  -> [OK] Next.js Dashboard Control Center - Port 3000' -ForegroundColor Green
        }

        # 1. Bat Server ChatGPT & Fanpage (Port 3001)
        `$serverFile = Join-Path `$bridgeDir 'server.mjs'
        if (Test-Path `$serverFile) {
            `$bridgeProcess = Start-Process -FilePath node -ArgumentList ('"' + `$serverFile + '"') -WorkingDirectory `$bridgeDir -PassThru -WindowStyle Hidden
            Write-Host '  -> [OK] Server 1 (Fanpage & ChatGPT Xen Ke) - Port 3001' -ForegroundColor Green
        }

        # 2. Bat Server Facebook Groups (Port 3002)
        `$groupServerFile = Join-Path `$bridgeDir 'group-server.mjs'
        if (Test-Path `$groupServerFile) {
            `$groupBridgeProcess = Start-Process -FilePath node -ArgumentList ('"' + `$groupServerFile + '"') -WorkingDirectory `$bridgeDir -PassThru -WindowStyle Hidden
            Write-Host '  -> [OK] Server 2 (Facebook Groups) - Port 3002' -ForegroundColor Green
        }

        # 3. Bat Server Facebook Trang Ca Nhan (Port 3003)
        `$personalServerFile = Join-Path `$bridgeDir 'personal-server.mjs'
        if (Test-Path `$personalServerFile) {
            `$personalBridgeProcess = Start-Process -FilePath node -ArgumentList ('"' + `$personalServerFile + '"') -WorkingDirectory `$bridgeDir -PassThru -WindowStyle Hidden
            Write-Host '  -> [OK] Server 3 (Facebook Trang Ca Nhan) - Port 3003' -ForegroundColor Green
        }

        Start-Sleep -Seconds 2

        # Tu dong mo giao dien Dashboard tren trinh duyet
        Write-Host '[bridge] Dang mo giao dien Dashboard tren trinh duyet: http://127.0.0.1:3000' -ForegroundColor Cyan
        Start-Process 'http://127.0.0.1:3000'

        Write-Host '[bridge] Toan bo he thong da san sang!' -ForegroundColor Cyan

        try {
            # Goi npx that (block cho den khi n8n tat)
            & `$script:_npxPath @args
        } finally {
            # Khi n8n tat -> tu dong tat tat ca cac server neu chinh minh da bat
            if (`$null -ne `$dashBridgeProcess -and -not `$dashBridgeProcess.HasExited) {
                Stop-Process -Id `$dashBridgeProcess.Id -Force -ErrorAction SilentlyContinue
                Write-Host '[bridge] Dashboard 3000 da tat.' -ForegroundColor Yellow
            }
            if (`$null -ne `$bridgeProcess -and -not `$bridgeProcess.HasExited) {
                Stop-Process -Id `$bridgeProcess.Id -Force -ErrorAction SilentlyContinue
                Write-Host '[bridge] Server 3001 da tat.' -ForegroundColor Yellow
            }
            if (`$null -ne `$groupBridgeProcess -and -not `$groupBridgeProcess.HasExited) {
                Stop-Process -Id `$groupBridgeProcess.Id -Force -ErrorAction SilentlyContinue
                Write-Host '[bridge] Server Groups 3002 da tat.' -ForegroundColor Yellow
            }
            if (`$null -ne `$personalBridgeProcess -and -not `$personalBridgeProcess.HasExited) {
                Stop-Process -Id `$personalBridgeProcess.Id -Force -ErrorAction SilentlyContinue
                Write-Host '[bridge] Server Ca Nhan 3003 da tat.' -ForegroundColor Yellow
            }
        }
    } else {
        & `$script:_npxPath @args
    }
}
# === end n8n bridge ===

"@

$profilePath = $PROFILE

# Doc profile hien tai
$current = ''
if (Test-Path -LiteralPath $profilePath) {
    $current = Get-Content -LiteralPath $profilePath -Raw
}

# Xoa hook cu
$cleaned = $current -replace '(?s)# === n8n bridge auto-start ===.*?# === end n8n bridge ===\s*', ''

$profileDir = Split-Path -Parent $profilePath
if (-not (Test-Path -LiteralPath $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}

# Ghi lai + them hook moi
Set-Content -LiteralPath $profilePath -Value (([string]$cleaned).TrimEnd() + "`r`n" + $hookCode)

Write-Host 'Da cap nhat hook trong PowerShell profile (Ho tro ca 3 Port: 3001, 3002 va 3003).' -ForegroundColor Green
Write-Host "Bridge Dir: $dir" -ForegroundColor Yellow
