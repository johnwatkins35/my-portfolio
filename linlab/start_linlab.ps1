# Opens a throwaway Ubuntu container. Only .\work is mounted from this PC.
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Work = Join-Path $Root 'work'
$Copies = Join-Path $Root 'work-copies'
$Sandbox = Join-Path $Root 'sandbox'
$Samples = Join-Path $Sandbox 'samples'
$Image = 'linlab:local'
$Log = Join-Path $Root 'linlab-launcher.log'

New-Item -ItemType Directory -Force -Path $Work, $Copies | Out-Null

function Write-Log([string]$Message) {
    Add-Content -Path $Log -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message)
}

function Test-DockerEngine {
    docker info *> $null
    return $LASTEXITCODE -eq 0
}

Write-Log 'Launch requested'

if (-not (Test-Path (Join-Path $Work 'cheatsheet.txt'))) {
    Copy-Item -Path (Join-Path $Samples '*') -Destination $Work -Recurse -Force
    Write-Log 'Seeded work from samples'
}

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

docker image inspect $Image *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Building the LinLab image. The first time can take a few minutes.'
    Write-Log 'Building image'
    docker build -t $Image $Root
    if ($LASTEXITCODE -ne 0) {
        Write-Log 'FAIL: image build'
        Write-Host 'The LinLab image did not build. See linlab-launcher.log.'
        Read-Host 'Press Enter to close'
        exit 1
    }
}

docker rm -f linlab *> $null

Write-Host ''
Write-Host 'LinLab sandbox' -ForegroundColor Cyan
Write-Host 'The only folder on this PC it can change is:'
Write-Host "  $Work"
Write-Host 'Type any Linux command. Type exit to leave.'
Write-Host ''

& docker run -it --rm `
    --name linlab `
    --hostname linlab `
    --cpus=2 `
    --memory=1g `
    --pids-limit=256 `
    --security-opt no-new-privileges `
    -v "${Work}:/work" `
    -v "${Copies}:/copies" `
    -v "${Sandbox}:/opt/linlab:ro" `
    -w /work `
    $Image `
    bash /opt/linlab/welcome.sh

$code = $LASTEXITCODE
Write-Log "Container exited $code"
if ($code -ne 0) {
    Write-Host "Sandbox exited with code $code. See linlab-launcher.log."
    Read-Host 'Press Enter to close'
    exit $code
}
exit 0
