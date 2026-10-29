# Treasure Hunt — Office Deployment Script
# Run this on the office server from the project folder:
#   PowerShell -ExecutionPolicy Bypass -File deploy.ps1

param(
  [switch]$SkipBuild,
  [switch]$MigrateOnly
)

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot

Write-Host "=== Treasure Hunt Deploy ===" -ForegroundColor Cyan
Write-Host "Project: $ProjectDir"
Write-Host "Time:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

Set-Location $ProjectDir

# 1. Copy .env.production -> .env if running on office server
if (Test-Path ".env.production") {
  Write-Host "[1/5] Loading production environment..." -ForegroundColor Yellow
  Copy-Item ".env.production" ".env" -Force
  Write-Host "      .env updated from .env.production"
} else {
  Write-Host "[1/5] WARNING: .env.production not found — using existing .env" -ForegroundColor Red
}

# 2. Install dependencies
if (-not $SkipBuild) {
  Write-Host "[2/5] Installing dependencies..." -ForegroundColor Yellow
  npm install --frozen-lockfile
  Write-Host "      Done"
} else {
  Write-Host "[2/5] Skipping install (--SkipBuild)" -ForegroundColor Gray
}

# 3. Run Prisma migrations
Write-Host "[3/5] Running database migrations..." -ForegroundColor Yellow
npx prisma migrate deploy
Write-Host "      Migrations applied"

# 4. Generate Prisma client
Write-Host "[4/5] Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "      Done"

if ($MigrateOnly) {
  Write-Host ""
  Write-Host "=== Migration complete (--MigrateOnly) ===" -ForegroundColor Green
  exit 0
}

# 5. Build Next.js
Write-Host "[5/5] Building Next.js app..." -ForegroundColor Yellow
npm run build
Write-Host "      Build complete"

Write-Host ""
Write-Host "=== Deploy complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Start the server with:" -ForegroundColor Cyan
Write-Host "  npm start"
Write-Host ""
Write-Host "Or to keep it running after logout:" -ForegroundColor Cyan
Write-Host "  npx pm2 start npm --name 'thunt' -- start"
Write-Host "  npx pm2 save"
