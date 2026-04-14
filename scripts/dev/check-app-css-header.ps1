param(
  [string]$CssPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path "DeepwellEducation/wwwroot/frontend/css/app.css")
)

if (-not (Test-Path -Path $CssPath)) {
  Write-Error "File not found: $CssPath"
  exit 2
}

$content = Get-Content -Path $CssPath -Raw

$headerMarker = "Aggregated app stylesheet entrypoint."
$importMarker = '@import url("./app.tokens.css");'

$headerCount = ([regex]::Matches($content, [regex]::Escape($headerMarker))).Count
$importCount = ([regex]::Matches($content, [regex]::Escape($importMarker))).Count

Write-Host "app.css duplicate check"
Write-Host "Path: $CssPath"
Write-Host "Header marker count: $headerCount"
Write-Host "Token import count: $importCount"

if ($headerCount -ne 1 -or $importCount -ne 1) {
  Write-Error "Detected unexpected repetition in app.css header/import block."
  exit 1
}

Write-Host "OK: app.css header/import block is unique."
exit 0
