$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$uploadDir = "F:\pinshang-shop-upload"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipPath = "F:\pinshang-shop-deploy-$stamp.zip"

$required = @("index.html", "styles.css", "data.js", "app.js", "assets", ".nojekyll")
foreach ($item in $required) {
  $path = Join-Path $projectRoot $item
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing required item: $path"
  }
}

if (-not (Test-Path -LiteralPath $uploadDir)) {
  New-Item -ItemType Directory -Path $uploadDir | Out-Null
}

foreach ($file in @("index.html", "styles.css", "data.js", "app.js", ".nojekyll")) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $uploadDir -Force
}

$assetTarget = Join-Path $uploadDir "assets"
if (Test-Path -LiteralPath $assetTarget) {
  Remove-Item -LiteralPath $assetTarget -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $projectRoot "assets") -Destination $uploadDir -Recurse -Force

$items = $required | ForEach-Object { Join-Path $projectRoot $_ }
Compress-Archive -LiteralPath $items -DestinationPath $zipPath

Write-Host "Upload folder: $uploadDir"
Write-Host "Zip package: $zipPath"
