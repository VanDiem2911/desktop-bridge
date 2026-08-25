# install-autostart.ps1
# Chay script nay MOT LAN de dang ky bridge server tu khoi dong cung Windows.

$taskName   = 'n8n-desktop-bridge'
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPath = Join-Path $scriptDir 'server.mjs'

# Tim duong dan node.exe
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$nodeExe = if ($nodeCmd) { $nodeCmd.Source } else { $null }
if (-not $nodeExe) {
    throw 'Khong tim thay node.exe. Hay cai Node.js va them vao PATH truoc.'
}

Write-Host "node.exe : $nodeExe"
Write-Host "server   : $serverPath"

# Action: node "server.mjs" trong thu muc desktop-bridge
$action = New-ScheduledTaskAction `
    -Execute          $nodeExe `
    -Argument         "`"$serverPath`"" `
    -WorkingDirectory $scriptDir

# Trigger: khi user hien tai dang nhap
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

# Settings: khong timeout, tu restart neu crash
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount       3 `
    -RestartInterval    (New-TimeSpan -Minutes 2) `
    -MultipleInstances  IgnoreNew

# Dang ky task (ghi de neu da ton tai)
Register-ScheduledTask `
    -TaskName  $taskName `
    -Action    $action `
    -Trigger   $trigger `
    -Settings  $settings `
    -RunLevel  Limited `
    -Force | Out-Null

Write-Host ""
Write-Host "==> Da dang ky '$taskName' thanh cong!" -ForegroundColor Green
Write-Host "    Bridge server se tu chay moi khi ban dang nhap Windows."
Write-Host ""

# Khoi dong ngay luon (khong can reboot)
Start-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
$info = Get-ScheduledTask -TaskName $taskName
Write-Host "==> Bridge server da duoc khoi dong." -ForegroundColor Cyan
Write-Host ""
Write-Host "De go cai dat: .\uninstall-autostart.ps1" -ForegroundColor DarkGray
