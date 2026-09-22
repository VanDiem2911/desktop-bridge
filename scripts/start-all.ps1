# start-all.ps1
$bridgeDir = "D:\HUDI\Non_N8N\desktop-bridge"
$dashDir = "$bridgeDir\dashboard"

Start-Process -FilePath "node" -ArgumentList "$dashDir\node_modules\next\dist\bin\next start -p 3000 -H 127.0.0.1" -WorkingDirectory $dashDir -WindowStyle Hidden
Start-Process -FilePath "node" -ArgumentList "server.mjs" -WorkingDirectory $bridgeDir -WindowStyle Hidden
Start-Process -FilePath "node" -ArgumentList "bot-server.mjs" -WorkingDirectory $bridgeDir -WindowStyle Hidden

Start-Sleep -Seconds 5
Get-NetTCPConnection -LocalPort 3000,3001,3004 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess, State
