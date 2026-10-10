$ErrorActionPreference = 'Continue'
Set-Location /work

$moduleDir = '/root/.local/share/powershell/Modules'
New-Item -ItemType Directory -Force -Path $moduleDir | Out-Null
if ($env:PSModulePath -notlike "*${moduleDir}*") {
    $env:PSModulePath = $moduleDir + [IO.Path]::PathSeparator + $env:PSModulePath
}

# Load the Pester version these exercises were written for, before a newer one can load.
if (Get-Module -ListAvailable -Name Pester | Where-Object { $_.Version -eq '5.5.0' }) {
    Import-Module Pester -RequiredVersion 5.5.0 -Force -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host 'PSLab sandbox' -ForegroundColor Cyan
Write-Host 'Type any PowerShell command. Help: Get-Help CommandName -Examples'
Write-Host 'Command list: Get-Content ./commands.txt'
Write-Host 'Your files stay in /work. Installed modules stay installed.'
Write-Host 'Type exit to leave.'
Write-Host ''
