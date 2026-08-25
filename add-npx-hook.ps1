# add-npx-hook.ps1
# Them ham override npx vao PowerShell profile
# Tu dong phat hien duong dan cua desktop-bridge, khong hardcode

$bridgeDir = (Split-Path -Parent $MyInvocation.MyCommand.Path) -replace '\\', '\\'

$hookCode = @"

# === n8n bridge auto-start ===
# Khi go "npx n8n", tu dong bat ca 3 bridge server truoc
function npx {
    if (`$args[0] -eq 'n8n') {
        # Tu dong tim thu muc desktop-bridge theo vi tri dang mo cua project
        `$currentLoc = (Get-Location).Path
        `$searchPaths = @(
            (Join-Path `$currentLoc 'desktop-bridge'),
            (Join-Path `$currentLoc '..\desktop-bridge'),
            (Join-Path (Split-Path `$currentLoc -Parent) 'desktop-bridge'),
            `$currentLoc
        )
        `$bridgeDir = `$searchPaths | Where-Object { Test-Path (Join-Path `$_ 'server.mjs') } | Select-Object -First 1

        `$listening3001 = netstat -an | Select-String ":3001.*LISTENING"
        `$listening3002 = netstat -an | Select-String ":3002.*LISTENING"
        `$listening3003 = netstat -an | Select-String ":3003.*LISTENING"
        if (-not `$listening3001 -or -not `$listening3002 -or -not `$listening3003) {
            if (-not `$listening3001) {
                Write-Host "[bridge] Dang bat server ChatGPT & Fanpage (3001)..." -ForegroundColor Yellow
            }
            if (-not `$listening3002) {
                Write-Host "[bridge] Dang bat server Facebook Groups (3002)..." -ForegroundColor Yellow
            }
            if (-not `$listening3003) {
                Write-Host "[bridge] Dang bat server Facebook Trang Ca Nhan (3003)..." -ForegroundColor Yellow
            }
            if (`$bridgeDir) {
                wscript /nologo (Join-Path `$bridgeDir 'run-hidden.vbs')
            }
            Start-Sleep -Seconds 5
            Write-Host "[bridge] Ca 3 server bridge san sang (3001, 3002 & 3003)." -ForegroundColor Green
        }
    }
    `$npxPath = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
    if (-not `$npxPath) { `$npxPath = (Get-Command npx -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1).Source }
    if (`$npxPath) { & `$npxPath @args } else { Write-Host "Khong tim thay npx.cmd" -ForegroundColor Red }
}
# === end n8n bridge ===

"@

$profilePath = $PROFILE
if (-not (Test-Path -LiteralPath $profilePath)) {
    $profileDir = Split-Path -Parent $profilePath
    if (-not (Test-Path -LiteralPath $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
}

$existing = Get-Content -LiteralPath $profilePath -Raw -ErrorAction SilentlyContinue
if ($existing -like '*n8n bridge auto-start*') {
    $cleaned = $existing -replace '(?s)# === n8n bridge auto-start ===.*?# === end n8n bridge ===\r?\n?', ''
    Set-Content -LiteralPath $profilePath -Value $cleaned.TrimEnd()
}
Add-Content -LiteralPath $profilePath -Value $hookCode
Write-Host "Da cap nhat hook trong PowerShell profile (2 server)." -ForegroundColor Green
Write-Host "Bridge dir: $bridgeDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Mo terminal moi va go: npx n8n" -ForegroundColor Cyan
