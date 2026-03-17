$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$hostAddress = '127.0.0.1'
$preferredPort = 4173
$maxPortOffset = 30
$chromeDebugHost = '127.0.0.1'
$preferredChromeDebugPort = 9222
$maxChromeDebugPortOffset = 30
$chromeProfileDir = Join-Path $env:TEMP '034gamejam-chrome-devtools-profile'
$browserLaunchLog = Join-Path $env:TEMP '034gamejam-browser-launch.log'

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

function Get-AvailablePort {
    param(
        [string]$HostAddress,
        [int]$PreferredPort,
        [int]$MaxPortOffset
    )

    for ($offset = 0; $offset -le $MaxPortOffset; $offset += 1) {
        $candidate = $PreferredPort + $offset
        if (-not (Test-PortInUse -HostAddress $HostAddress -Port $candidate)) {
            return $candidate
        }
    }

    return $null
}

function Get-ChromeExecutablePath {
    $candidatePaths = @(
        (Join-Path ${env:ProgramFiles} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
    ) | Where-Object { $_ -and (Test-Path $_) }

    $candidatePaths = @($candidatePaths)

    if ($candidatePaths.Count -gt 0) {
        return $candidatePaths[0]
    }

    $registryLocations = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe'
    )

    foreach ($location in $registryLocations) {
        try {
            $chromePath = (Get-ItemProperty -Path $location -ErrorAction Stop).'(default)'
            if ($chromePath -and (Test-Path $chromePath)) {
                return $chromePath
            }
        } catch {}
    }

    return $null
}

$port = Get-AvailablePort -HostAddress $hostAddress -PreferredPort $preferredPort -MaxPortOffset $maxPortOffset

if (-not $port) {
    throw "[034GameJam] Failed to find an available dev port in range $preferredPort-$($preferredPort + $maxPortOffset)."
}

if ($port -ne $preferredPort) {
    Write-Host "[034GameJam] Port $preferredPort is busy, using port $port."
}

$url = "http://$hostAddress`:$port/index.html"
$pingUrl = "http://$hostAddress`:$port/__api/ping"
$chromeDebugPort = Get-AvailablePort -HostAddress $chromeDebugHost -PreferredPort $preferredChromeDebugPort -MaxPortOffset $maxChromeDebugPortOffset
$chromePath = Get-ChromeExecutablePath

if (-not $chromeDebugPort) {
    throw "[034GameJam] Failed to find an available Chrome DevTools port in range $preferredChromeDebugPort-$($preferredChromeDebugPort + $maxChromeDebugPortOffset)."
}

Write-Host "[034GameJam] Starting dev server at $url"
Write-Host "[034GameJam] Repo root: $repoRoot"
Write-Host "[034GameJam] Chrome DevTools endpoint: http://$chromeDebugHost`:$chromeDebugPort"
Write-Host "[034GameJam] Browser launch log: $browserLaunchLog"

if ($chromePath) {
    Write-Host "[034GameJam] Chrome executable: $chromePath"
    Write-Host "[034GameJam] Chrome profile dir: $chromeProfileDir"
} else {
    Write-Warning "[034GameJam] Google Chrome was not found. The dev server will still start, but no MCP-ready browser will be launched."
}

Set-Content -Path $browserLaunchLog -Value @(
    "[bootstrap] repoRoot=$repoRoot"
    "[bootstrap] url=$url"
    "[bootstrap] pingUrl=$pingUrl"
    "[bootstrap] chromePath=$chromePath"
    "[bootstrap] chromeDebugPort=$chromeDebugPort"
    "[bootstrap] chromeProfileDir=$chromeProfileDir"
) -Encoding UTF8

Start-Job -ScriptBlock {
    param(
        [string]$PingUrl,
        [string]$ChromePath,
        [string]$ChromeDebugHost,
        [int]$ChromeDebugPort,
        [string]$ChromeProfileDir,
        [string]$Url,
        [string]$LogPath
    )

    $ErrorActionPreference = 'Stop'

    function Write-LaunchLog {
        param([string]$Message)

        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'
        Add-Content -Path $LogPath -Value "[$timestamp] $Message"
    }

    try {
        Write-LaunchLog "launcher-start ping=$PingUrl url=$Url chromePath=$ChromePath debugPort=$ChromeDebugPort"

        for ($i = 0; $i -lt 120; $i += 1) {
            try {
                $response = Invoke-WebRequest -Uri $PingUrl -UseBasicParsing -TimeoutSec 1
                Write-LaunchLog "ping-attempt index=$i status=$($response.StatusCode)"
                if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
                    if ($ChromePath -and (Test-Path $ChromePath)) {
                        $arguments = @(
                            "--remote-debugging-address=$ChromeDebugHost",
                            "--remote-debugging-port=$ChromeDebugPort",
                            "--user-data-dir=$ChromeProfileDir",
                            '--no-first-run',
                            '--no-default-browser-check',
                            '--new-window',
                            $Url
                        )
                        Write-LaunchLog "launch-chrome args=$($arguments -join ' ')"
                        $process = Start-Process -FilePath $ChromePath -ArgumentList $arguments -PassThru
                        Write-LaunchLog "launch-chrome-success pid=$($process.Id)"
                    } else {
                        Write-LaunchLog 'launch-fallback-default-browser'
                        $process = Start-Process $Url -PassThru
                        Write-LaunchLog "launch-fallback-success pid=$($process.Id)"
                    }
                    break
                }
            } catch {
                Write-LaunchLog "ping-attempt-failed index=$i error=$($_.Exception.Message)"
            }

            Start-Sleep -Milliseconds 150
        }
    } catch {
        Write-LaunchLog "launcher-error error=$($_.Exception.Message)"
    }
} -ArgumentList $pingUrl, $chromePath, $chromeDebugHost, $chromeDebugPort, $chromeProfileDir, $url, $browserLaunchLog | Out-Null

if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 tools/dev_server.py --host $hostAddress --port $port
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    & python tools/dev_server.py --host $hostAddress --port $port
} else {
    throw '[034GameJam] Python was not found. Please install Python or add it to PATH.'
}
