# Opens QueryLab in the browser. CSV and SQLite files stay in this folder's data directory.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host 'Python was not found. Install Python 3, then run this launcher again.'
    Read-Host 'Press Enter to close'
    exit 1
}

python server.py
