$chromeCandidates = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
  (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe')
)
$chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$profilePath = Join-Path $env:LOCALAPPDATA 'n8n-chatgpt-profile'

if (-not $chromePath) {
  throw "Chrome was not found on this system."
}

$arguments = '--remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 --user-data-dir="' + $profilePath + '" https://chatgpt.com/'
Start-Process -FilePath $chromePath -ArgumentList $arguments

Write-Host 'Chrome started. Sign in to ChatGPT in the new window, then keep it open.'
