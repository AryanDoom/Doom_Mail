$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$apiDir = Join-Path $root "localstuff"
$frontendDir = Join-Path $root "frontend"
$apiExe = Join-Path $apiDir ".venv\Scripts\uvicorn.exe"
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$npmCmd = Join-Path (Split-Path $nodePath) "npm.cmd"

if (-not (Test-Path $apiExe)) {
  throw "API environment not found at $apiExe"
}

function Test-LocalPort([int]$port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $client.Connect("127.0.0.1", $port)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

if (-not (Test-LocalPort 8787)) {
  Start-Process -FilePath $apiExe `
    -ArgumentList @("api:app", "--host", "127.0.0.1", "--port", "8787") `
    -WorkingDirectory $apiDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $apiDir "api.stdout.log") `
    -RedirectStandardError (Join-Path $apiDir "api.stderr.log")
}

if (-not (Test-LocalPort 3000)) {
  Start-Process -FilePath $npmCmd `
    -ArgumentList @("run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3000") `
    -WorkingDirectory $frontendDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $frontendDir "dev.stdout.log") `
    -RedirectStandardError (Join-Path $frontendDir "dev.stderr.log")
}

Write-Host "API: http://localhost:8787"
Write-Host "Website: http://localhost:3000"
Write-Host "Compose: http://localhost:3000/compose"
