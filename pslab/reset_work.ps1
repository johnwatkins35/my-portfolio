# Saves a copy of .\work, then restores the sample files.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Work = Join-Path $Root 'work'
$Samples = Join-Path $Root 'sandbox\samples'
$Copies = Join-Path $Root 'work-copies'

if (-not (Test-Path $Samples)) {
    Write-Error "Sample folder missing: $Samples"
}

$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$dest = Join-Path $Copies "work-$stamp"
New-Item -ItemType Directory -Force -Path $Copies | Out-Null
Copy-Item -Path $Work -Destination $dest -Recurse -Force
Write-Host "Saved a copy at $dest"

Get-ChildItem -Force -Path $Work | Where-Object { $_.Name -ne 'tiny' } | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $Samples '*') -Destination $Work -Recurse -Force
Write-Host "Restored sample files in $Work"
