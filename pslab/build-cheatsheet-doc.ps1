$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'work\command-cheatsheet.txt'
$outPath = Join-Path $PSScriptRoot 'PSLab-Command-Cheatsheet.docx'
$lines = Get-Content -Path $source

function Escape-Xml([string]$Text) {
    return ($Text -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;')
}

function New-Run([string]$Text, [int]$HalfPoints, [bool]$Bold, [string]$Font) {
    $safe = Escape-Xml $Text
    $bold = if ($Bold) { '<w:b/>' } else { '' }
    return "<w:r><w:rPr>$bold<w:rFonts w:ascii=`"$Font`" w:hAnsi=`"$Font`"/><w:sz w:val=`"$HalfPoints`"/></w:rPr><w:t xml:space=`"preserve`">$safe</w:t></w:r>"
}

$paragraphs = New-Object System.Collections.Generic.List[string]
$first = $true
foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($first) {
        $paragraphs.Add("<w:p><w:pPr><w:spacing w:after=`"200`"/></w:pPr>$(New-Run $line.Trim() 44 $true 'Calibri')</w:p>")
        $first = $false
    } elseif ($line.StartsWith('    ')) {
        $paragraphs.Add("<w:p><w:pPr><w:ind w:left=`"720`"/><w:spacing w:after=`"80`"/></w:pPr>$(New-Run $line.Trim() 22 $false 'Calibri')</w:p>")
    } elseif ($line.StartsWith('  ')) {
        $paragraphs.Add("<w:p><w:pPr><w:ind w:left=`"360`"/><w:spacing w:before=`"80`" w:after=`"40`"/></w:pPr>$(New-Run $line.Trim() 22 $true 'Consolas')</w:p>")
    } else {
        $paragraphs.Add("<w:p><w:pPr><w:spacing w:before=`"280`" w:after=`"80`"/></w:pPr>$(New-Run $line.Trim() 32 $true 'Calibri')</w:p>")
    }
}

$document = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    $($paragraphs -join "`n")
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="864" w:right="864" w:bottom="864" w:left="864"/></w:sectPr>
  </w:body>
</w:document>
"@

$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
'@

$rels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'@

$temp = Join-Path $PSScriptRoot 'cheatsheet-docx-build'
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $temp '_rels') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $temp 'word') | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $temp '[Content_Types].xml'), $contentTypes, $utf8)
[System.IO.File]::WriteAllText((Join-Path $temp '_rels\.rels'), $rels, $utf8)
[System.IO.File]::WriteAllText((Join-Path $temp 'word\document.xml'), $document, $utf8)

if (Test-Path $outPath) { Remove-Item $outPath -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($temp, $outPath)
Remove-Item $temp -Recurse -Force
Write-Output "WROTE $outPath"
