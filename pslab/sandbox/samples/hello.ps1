param(
    [string]$Name
)

if ([string]::IsNullOrWhiteSpace($Name)) {
    Write-Output 'Hello, World!'
} else {
    Write-Output "Hello, $Name!"
}
