# update-task-hidden.ps1 — cap nhat Task Scheduler dung wscript an
$taskName  = 'n8n-desktop-bridge'
$scriptDir = $PSScriptRoot
$vbsPath   = Join-Path $scriptDir 'run-hidden.vbs'

$action = New-ScheduledTaskAction `
    -Execute          'wscript.exe' `
    -Argument         "`"$vbsPath`"" `
    -WorkingDirectory $scriptDir

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount       3 `
    -RestartInterval    (New-TimeSpan -Minutes 2) `
    -MultipleInstances  IgnoreNew

Register-ScheduledTask `
    -TaskName  $taskName `
    -Action    $action `
    -Trigger   $trigger `
    -Settings  $settings `
    -RunLevel  Limited `
    -Force | Out-Null

Write-Host "Task da cap nhat - se chay an khi dang nhap." -ForegroundColor Green

# Kill server cu (neu co), chay lai bang VBS (an)
Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 3
Write-Host "Server dang chay an - khong co cua so console." -ForegroundColor Cyan
