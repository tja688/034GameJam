$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$port = 4173
$url = "http://127.0.0.1:$port/index.html"

Write-Host "[034GameJam] Opening $url"
Start-Process $url | Out-Null

if (Get-Command py -ErrorAction SilentlyContinue) {
    py -3 tools/dev_server.py --host 127.0.0.1 --port $port
} else {
    python tools/dev_server.py --host 127.0.0.1 --port $port
}
