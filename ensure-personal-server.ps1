# ensure-personal-server.ps1
# Duoc goi boi n8n workflow ca nhan - tu dong bat personal-server neu chua chay

$port    = 3003
$vbs     = Join-Path $PSScriptRoot 'run-hidden.vbs'

# Kiem tra port 3003 co dang lang nghe khong
$isListening = netstat -an | Select-String ":$port\s.*LISTENING"

if (-not $isListening) {
    Start-Process wscript -ArgumentList "`"$vbs`"" -WindowStyle Hidden

    $deadline = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 1000
        $isListening = netstat -an | Select-String ":$port\s.*LISTENING"
        if ($isListening) { break }
    }
}

if ($isListening) {
    Write-Output "personal-server-ready"
} else {
    Write-Error "Personal Server khong khoi dong duoc trong 20 giay"
    exit 1
}
