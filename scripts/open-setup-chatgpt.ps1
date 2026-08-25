param(
    [Parameter(Position=0)]
    [ValidateRange(1, 2)]
    [int]$Account
)

if (-not $Account) {
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "     SETUP TAI KHOAN CHATGPT DANG BAI (3001)     " -ForegroundColor Yellow
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "Chon tai khoan ChatGPT ban muon mo de dang nhap:"
    Write-Host " 1. Tai khoan 1 (Profile: n8n-chatgpt-profile, Port: 9222)"
    Write-Host " 2. Tai khoan 2 (Profile: n8n-chatgpt-profile-2, Port: 9242) [Xen ke/Du phong]"
    Write-Host "================================================="
    $choice = Read-Host "Nhap so (1 hoac 2)"
    $Account = [int]$choice
}

if ($Account -ne 1 -and $Account -ne 2) {
    Write-Host "Lua chon khong hop le (chi nhap 1 hoac 2)." -ForegroundColor Red
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
    Write-Host "Khong tim thay Chrome tren may." -ForegroundColor Red
    exit 1
}

$profileDirName = if ($Account -eq 1) { 'n8n-chatgpt-profile' } else { 'n8n-chatgpt-profile-2' }
$profilePath = Join-Path $env:LOCALAPPDATA $profileDirName
$port = if ($Account -eq 1) { 9222 } else { 9242 }

Write-Host "-> Dang mo Chrome cho ChatGPT Tai khoan $Account (Profile: $profileDirName, Port: $port)..." -ForegroundColor Green
Write-Host "-> Hay dang nhap tai khoan ChatGPT tren cua so Chrome vua mo." -ForegroundColor Yellow

$arguments = "--remote-debugging-address=127.0.0.1 --remote-debugging-port=$port --user-data-dir=`"$profilePath`" https://chatgpt.com/"
Start-Process -FilePath $chromePath -ArgumentList $arguments

Write-Host "Sau khi dang nhap xong, ban de nguyen cua so nay de server 3001 tu dong tao anh xen ke!" -ForegroundColor Cyan
