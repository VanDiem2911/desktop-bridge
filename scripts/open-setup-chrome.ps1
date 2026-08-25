param(
    [Parameter(Position=0)]
    [ValidateRange(1, 10)]
    [int]$Account
)

if (-not $Account) {
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "   SETUP TAI KHOAN FACEBOOK DANG BAI GROUP   " -ForegroundColor Yellow
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "Chon so thu tu tai khoan ban muon mo de dang nhap:"
    Write-Host " 1. Tai khoan 1 (Profile: n8n-fb-group-profile-1)"
    Write-Host " 2. Tai khoan 2 (Profile: n8n-fb-group-profile-2)"
    Write-Host " 3. Tai khoan 3 (Profile: n8n-fb-group-profile-3)"
    Write-Host " 4. Tai khoan 4 (Profile: n8n-fb-group-profile-4)"
    Write-Host " 5. Tai khoan 5 (Profile: n8n-fb-group-profile-5)"
    Write-Host " 6. Tai khoan 6 (Profile: n8n-fb-group-profile-6)"
    Write-Host " 7. Tai khoan 7 (Profile: n8n-fb-group-profile-7)"
    Write-Host "============================================="
    $choice = Read-Host "Nhap so (1 - 7)"
    $Account = [int]$choice
}

if ($Account -lt 1 -or $Account -gt 7) {
    Write-Host "So tai khoan khong hop le (chi tu 1 den 7)." -ForegroundColor Red
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

$profileDirName = "n8n-fb-group-profile-$Account"
$profilePath = Join-Path $env:LOCALAPPDATA $profileDirName

Write-Host "-> Dang mo Chrome cho Tai khoan $Account (Profile: $profileDirName)..." -ForegroundColor Green
Write-Host "-> Hay dang nhap Facebook tren cua so Chrome vua mo." -ForegroundColor Yellow

$port = 9222 + $Account
$arguments = "--remote-debugging-address=127.0.0.1 --remote-debugging-port=$port --user-data-dir=`"$profilePath`" https://www.facebook.com/"
Start-Process -FilePath $chromePath -ArgumentList $arguments

Write-Host "Sau khi dang nhap xong, ban co the de nguyen cua so nay hoac mo tiep tai khoan khac." -ForegroundColor Cyan
