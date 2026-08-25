param(
    [Parameter(Position=0)]
    [ValidateRange(1, 5)]
    [int]$Account
)

if (-not $Account) {
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "   SETUP TAI KHOAN CHATGPT & FACEBOOK CA NHAN    " -ForegroundColor Yellow
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "Chon so thu tu tai khoan ban muon mo de dang nhap:"
    Write-Host " 1. Tai khoan 1 (Profile: n8n-personal-profile-1, Port: 9230)"
    Write-Host " 2. Tai khoan 2 (Profile: n8n-personal-profile-2, Port: 9231) [Du phong]"
    Write-Host " 3. Tai khoan 3 (Profile: n8n-personal-profile-3, Port: 9232) [Du phong]"
    Write-Host "================================================="
    $choice = Read-Host "Nhap so (1 - 3)"
    $Account = [int]$choice
}

if ($Account -lt 1 -or $Account -gt 5) {
    Write-Host "So tai khoan khong hop le (chi tu 1 den 5)." -ForegroundColor Red
    exit 1
}

$chromeCandidates = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
  (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe')
)
$chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $chromePath) {
    Write-Host "Khong tim thay Chrome tren may cua ban." -ForegroundColor Red
    exit 1
}

$profileDirName = "n8n-personal-profile-$Account"
$profilePath = Join-Path $env:LOCALAPPDATA $profileDirName
$port = 9229 + $Account

Write-Host "-> Dang mo Chrome cho Tai khoan Ca nhan $Account (Profile: $profileDirName, Port: $port)..." -ForegroundColor Green
Write-Host "-> Trinh duyet se mo ChatGPT va Facebook de ban dang nhap." -ForegroundColor Yellow

$arguments = "--remote-debugging-address=127.0.0.1 --remote-debugging-port=$port --user-data-dir=`"$profilePath`" https://chatgpt.com/ https://www.facebook.com/"
Start-Process -FilePath $chromePath -ArgumentList $arguments

Write-Host "Sau khi dang nhap xong Facebook va ChatGPT, ban de nguyen cua so nay de n8n tu dong thao tac!" -ForegroundColor Cyan
