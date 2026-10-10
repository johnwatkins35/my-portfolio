if (-not (Test-Path /copies)) {
    Write-Output 'Close this window, open PSLab again, then run ./copy-work.ps1'
    exit 1
}

$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$dest = "/copies/work-$stamp"
Copy-Item -Path /work -Destination $dest -Recurse -Force
Write-Output "Saved a copy. On this PC it is C:\Users\johnw\Projects\pslab\work-copies\work-$stamp"
