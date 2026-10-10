# Opens a throwaway PowerShell 7 container. Only .\work is mounted from this PC.
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Work = Join-Path $Root 'work'
$Modules = Join-Path $Root 'modules'
$Copies = Join-Path $Root 'work-copies'
$Sandbox = Join-Path $Root 'sandbox'
$Image = 'mcr.microsoft.com/powershell:lts'
$Log = Join-Path $Root 'pslab-launcher.log'

New-Item -ItemType Directory -Force -Path $Work, $Modules, $Copies | Out-Null

function Write-Log([string]$Message) {
    Add-Content -Path $Log -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message)
}

function Test-DockerEngine {
    docker info *> $null
    return $LASTEXITCODE -eq 0
}

Write-Log 'Launch requested'

if (-not (Test-DockerEngine)) {
    $dockerDesktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (Test-Path $dockerDesktop) {
        Write-Host 'Starting Docker Desktop. This can take a minute.'
        Write-Log 'Starting Docker Desktop'
        Start-Process $dockerDesktop | Out-Null
    } else {
        Write-Host 'Docker Desktop was not found. Install it, then run this launcher again.'
        Write-Log 'FAIL: Docker Desktop missing'
        Read-Host 'Press Enter to close'
        exit 1
    }

    $ready = $false
    foreach ($i in 1..60) {
        Start-Sleep -Seconds 2
        if (Test-DockerEngine) {
            $ready = $true
            Write-Log "Docker ready after $($i * 2)s"
            break
        }
    }
    if (-not $ready) {
        Write-Host 'Docker did not become ready. Open Docker Desktop, wait until it says running, then try again.'
        Write-Log 'FAIL: Docker not ready'
        Read-Host 'Press Enter to close'
        exit 1
    }
}

docker rm -f pslab *> $null

Write-Host ''
Write-Host 'PSLab sandbox' -ForegroundColor Cyan
Write-Host 'Folders kept on this PC:'
Write-Host "  $Work"
Write-Host "  $Modules"
Write-Host 'Type any PowerShell command. Type exit to leave.'
Write-Host ''

& docker run -it --rm `
    --name pslab `
    --hostname pslab `
    --cpus=2 `
    --memory=1g `
    --pids-limit=256 `
    --security-opt no-new-privileges `
    -e POWERSHELL_TELEMETRY_OPTOUT=1 `
    -v "${Work}:/work" `
    -v "${Copies}:/copies" `
    -v "${Modules}:/root/.local/share/powershell/Modules" `
    -v "${Sandbox}:/opt/pslab:ro" `
    -w /work `
    $Image `
    pwsh -NoExit -NoLogo -File /opt/pslab/welcome.ps1

$code = $LASTEXITCODE
Write-Log "Container exited $code"
if ($code -ne 0) {
    Write-Host "Sandbox exited with code $code. See pslab-launcher.log."
    Read-Host 'Press Enter to close'
    exit $code
}
exit 0
