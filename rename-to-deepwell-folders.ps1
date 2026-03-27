# Legacy helper: renames LanguageSchoolManagement* folders to DeepwellEducation* and fixes .sln paths.
# If your repo already has DeepwellEducation\ and DeepwellEducation.Tests\, you do not need this script.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

if (-not (Test-Path (Join-Path $root "LanguageSchoolManagement"))) {
    Write-Host "No LanguageSchoolManagement folder found; migration already applied or not needed."
    exit 0
}

if (Test-Path (Join-Path $root "DeepwellEducation")) {
    Write-Host "Both LanguageSchoolManagement and DeepwellEducation exist. Resolve manually."
    exit 1
}

Rename-Item -LiteralPath (Join-Path $root "LanguageSchoolManagement") -NewName "DeepwellEducation"
Rename-Item -LiteralPath (Join-Path $root "LanguageSchoolManagement.Tests") -NewName "DeepwellEducation.Tests"

$slnPath = Join-Path $root "DeepwellEducation.sln"
$sln = [System.IO.File]::ReadAllText($slnPath)
$sln = $sln.Replace(
    "LanguageSchoolManagement\DeepwellEducation.csproj",
    "DeepwellEducation\DeepwellEducation.csproj"
)
$sln = $sln.Replace(
    "LanguageSchoolManagement.Tests\DeepwellEducation.Tests.csproj",
    "DeepwellEducation.Tests\DeepwellEducation.Tests.csproj"
)
[System.IO.File]::WriteAllText($slnPath, $sln)

$testProj = Join-Path $root "DeepwellEducation.Tests\DeepwellEducation.Tests.csproj"
$tp = [System.IO.File]::ReadAllText($testProj)
$tp = $tp.Replace(
    "..\LanguageSchoolManagement\DeepwellEducation.csproj",
    "..\DeepwellEducation\DeepwellEducation.csproj"
)
[System.IO.File]::WriteAllText($testProj, $tp)

Write-Host "Done."
