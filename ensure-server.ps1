# ensure-server.ps1
# Duoc goi boi n8n workflow - tu dong bat server neu chua chay

$port    = 3001
$vbs     = Join-Path $PSScriptRoot 'run-hidden.vbs'

# Kiem tra port 3001 co dang lang nghe khong
$isListening = netstat -an | Select-String ":$port\s.*LISTENING"

if (-not $isListening) {
    # Chua chay - bat server an (khong co cua so console)
    Start-Process wscript -ArgumentList "`"$vbs`"" -WindowStyle Hidden

    # Cho toi da 20 giay de server san sang
    $deadline = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 1000
        $isListening = netstat -an | Select-String ":$port\s.*LISTENING"
        if ($isListening) { break }
    }
}

if ($isListening) {
    Write-Output "server-ready"
} else {
    Write-Error "Server khong khoi dong duoc trong 20 giay"
    exit 1
}
