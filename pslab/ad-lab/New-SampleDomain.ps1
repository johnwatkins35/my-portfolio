# Run this on the Windows Server VM after it is a domain controller for lab.local.
# Do not run it in PSLab. Do not run it on a real work domain.
$ErrorActionPreference = 'Stop'

if (-not (Get-Module -ListAvailable -Name ActiveDirectory)) {
    Write-Host 'The Active Directory module is not on this machine.'
    Write-Host 'Run this script on the lab.local domain controller.'
    exit 1
}

Import-Module ActiveDirectory
$dns = (Get-ADDomain).DNSRoot
if ($dns -ne 'lab.local') {
    Write-Host "This domain is $dns."
    Write-Host 'Sample users are only added when the domain is lab.local.'
    exit 1
}

$root = (Get-ADDomain).DistinguishedName
$password = ConvertTo-SecureString 'LabPractice1!' -AsPlainText -Force

foreach ($ouName in @('Staff', 'Contractors')) {
    if (-not (Get-ADOrganizationalUnit -Filter "Name -eq '$ouName'" -SearchBase $root -ErrorAction SilentlyContinue)) {
        New-ADOrganizationalUnit -Name $ouName -Path $root
        Write-Host "Created OU $ouName"
    }
}

$staff = "OU=Staff,$root"
$contractors = "OU=Contractors,$root"

foreach ($groupName in @('IT-Admins', 'Helpdesk', 'Facilities')) {
    $ou = if ($groupName -eq 'Helpdesk') { $contractors } else { $staff }
    if (-not (Get-ADGroup -Filter "Name -eq '$groupName'" -ErrorAction SilentlyContinue)) {
        New-ADGroup -Name $groupName -GroupScope Global -GroupCategory Security -Path $ou
        Write-Host "Created group $groupName"
    }
}

$users = @(
    @{ Name = 'Jane Lee';  Sam = 'jlee';  Enabled = $true;  OU = $staff;       Department = 'IT';         Groups = @('IT-Admins') }
    @{ Name = 'Omar Shah'; Sam = 'oshah'; Enabled = $true;  OU = $staff;       Department = 'Facilities'; Groups = @('Facilities') }
    @{ Name = 'Priya Nair'; Sam = 'pnair'; Enabled = $false; OU = $staff;       Department = 'IT';         Groups = @('IT-Admins') }
    @{ Name = 'Chris Hale'; Sam = 'chale'; Enabled = $true;  OU = $contractors; Department = 'Helpdesk';   Groups = @('Helpdesk') }
    @{ Name = 'Riley Chen'; Sam = 'rchen'; Enabled = $false; OU = $contractors; Department = 'Helpdesk';   Groups = @('Helpdesk') }
)

foreach ($user in $users) {
    $existing = Get-ADUser -Filter "SamAccountName -eq '$($user.Sam)'" -ErrorAction SilentlyContinue
    if (-not $existing) {
        New-ADUser -Name $user.Name -SamAccountName $user.Sam -UserPrincipalName "$($user.Sam)@lab.local" -AccountPassword $password -Enabled $user.Enabled -Path $user.OU -Department $user.Department -ChangePasswordAtLogon $false
        Write-Host "Created user $($user.Sam)"
    }
    foreach ($groupName in $user.Groups) {
        $already = Get-ADGroupMember -Identity $groupName | Where-Object { $_.SamAccountName -eq $user.Sam }
        if (-not $already) {
            Add-ADGroupMember -Identity $groupName -Members $user.Sam
            Write-Host "Added $($user.Sam) to $groupName"
        }
    }
}

Write-Host ''
Write-Host 'Sample directory is ready. Practice password for every user: LabPractice1!'
Get-ADUser -Filter * -Properties Department, Enabled | Select-Object Name, SamAccountName, Enabled, Department | Format-Table
