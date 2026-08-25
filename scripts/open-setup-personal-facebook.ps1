# open-setup-personal-facebook.ps1
# Mo Chrome rieng biet de dang nhap Nick Facebook Ca Nhan (Profile: n8n-fb-personal-profile, Port: 9230)

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

$profileDirName = "n8n-fb-personal-profile"
$profilePath = Join-Path $env:LOCALAPPDATA $profileDirName
$port = 9230

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "    SETUP NICK FACEBOOK TRANG CA NHAN (NICK 2)   " -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "-> Dang mo Chrome Profile rieng: $profileDirName tren Port: $port..." -ForegroundColor Green
Write-Host "-> Hay dang nhap Nick Facebook Ca Nhan cua ban tren cua so vua mo." -ForegroundColor Yellow

$arguments = "--remote-debugging-address=127.0.0.1 --remote-debugging-port=$port --user-data-dir=`"$profilePath`" https://www.facebook.com/"
Start-Process -FilePath $chromePath -ArgumentList $arguments

Write-Host "Sau khi dang nhap xong Facebook ca nhan, ban de nguyen cua so nay de server 3003 tu dong dang bai!" -ForegroundColor Cyan
