$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

Write-Host "正在准备发布商品更新..." -ForegroundColor Cyan

$allowedFiles = @(
  "data.js",
  "assets/wechat-qr.jpg",
  "assets/wechat-qr.jpeg",
  "assets/wechat-qr.png",
  "assets/wechat-qr.webp"
)

foreach ($file in $allowedFiles) {
  if (Test-Path -LiteralPath $file) {
    git add -- $file
  }
}

$imageExts = @(".jpg", ".jpeg", ".png", ".webp", ".svg")
$productDir = Join-Path $PSScriptRoot "assets\products"
if (Test-Path -LiteralPath $productDir) {
  Get-ChildItem -LiteralPath $productDir -Recurse -File |
    Where-Object { $imageExts -contains $_.Extension.ToLowerInvariant() } |
    ForEach-Object {
      $relative = Resolve-Path -LiteralPath $_.FullName -Relative
      git add -- $relative
    }
}

$changes = git diff --cached --name-only
if (-not $changes) {
  Write-Host "没有发现需要发布的商品改动。" -ForegroundColor Yellow
  Write-Host "如果刚刚改过商品，请先在商品助手里点：保存当前商品到列表 -> 保存到 data.js。"
  exit 0
}

Write-Host "本次将发布这些文件：" -ForegroundColor Cyan
$changes | ForEach-Object { Write-Host " - $_" }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
git commit -m "update products $stamp"
git -c credential.username=shi3435254161-lgtm push

Write-Host ""
Write-Host "发布完成。正式访问：" -ForegroundColor Green
Write-Host "https://shop.reverser9n6h12.me/"
Write-Host "如果微信里没立刻刷新，可以访问："
Write-Host "https://shop.reverser9n6h12.me/?v=$stamp"
