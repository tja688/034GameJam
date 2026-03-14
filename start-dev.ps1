$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$hostAddress = '127.0.0.1'
$preferredPort = 4173
$maxPortOffset = 30

function Test-PortInUse {
    param(
        [string]$HostAddress,
        [int]$Port
    )

    $listener = $null
    try {
        $ipAddress = [System.Net.IPAddress]::Parse($HostAddress)
        $listener = [System.Net.Sockets.TcpListener]::new($ipAddress, $Port)
        $listener.Start()
        return $false
    } catch {
        return $true
    } finally {
        if ($listener) {
            $listener.Stop()
        }
    }
}

$port = $null
for ($offset = 0; $offset -le $maxPortOffset; $offset += 1) {
    $candidate = $preferredPort + $offset
    if (-not (Test-PortInUse -HostAddress $hostAddress -Port $candidate)) {
        $port = $candidate
        break
    }
}

if (-not $port) {
    throw "[034GameJam] Failed to find an available dev port in range $preferredPort-$($preferredPort + $maxPortOffset)."
}

if ($port -ne $preferredPort) {
    Write-Host "[034GameJam] Port $preferredPort is busy, using port $port."
}

$url = "http://$hostAddress`:$port/index.html"
$pingUrl = "http://$hostAddress`:$port/__api/ping"
Write-Host "[034GameJam] Starting dev server at $url"
Write-Host "[034GameJam] Repo root: $repoRoot"

$openBrowserCommand = @"
`$ErrorActionPreference = 'SilentlyContinue'
for (`$i = 0; `$i -lt 120; `$i += 1) {
    try {
        `$response = Invoke-WebRequest -Uri '$pingUrl' -UseBasicParsing -TimeoutSec 1
        if (`$response.StatusCode -ge 200 -and `$response.StatusCode -lt 300) {
            Start-Process '$url' | Out-Null
            break
        }
    } catch {}
    Start-Sleep -Milliseconds 150
}
"@

Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile', '-Command', $openBrowserCommand | Out-Null

if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 tools/dev_server.py --host $hostAddress --port $port
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    & python tools/dev_server.py --host $hostAddress --port $port
} else {
    throw '[034GameJam] Python was not found. Please install Python or add it to PATH.'
}
