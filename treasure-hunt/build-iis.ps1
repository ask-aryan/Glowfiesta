# GlowFiesta IIS Deployment & Publish Packager

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "       GlowFiesta - IIS Publish Packager     " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$rootDir = $PSScriptRoot
$publishDir = Join-Path $rootDir "publish_iis"

# 1. Clean previous build directory
if (Test-Path $publishDir) {
    Write-Host "[1/5] Cleaning existing publish_iis directory..." -ForegroundColor Yellow
    Remove-Item -Path $publishDir -Recurse -Force
}

# 2. Build Next.js production build
Write-Host "[2/5] Running Next.js production build..." -ForegroundColor Yellow
Set-Location $rootDir
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Please check errors." -ForegroundColor Red
    Exit 1
}

# 3. Create target deployment directory
Write-Host "[3/5] Packaging production build..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $publishDir | Out-Null

# Copy .next folder
$publishNext = Join-Path $publishDir ".next"
New-Item -ItemType Directory -Force -Path $publishNext | Out-Null
Copy-Item -Path (Join-Path $rootDir ".next\*") -Destination $publishNext -Recurse -Force

# Copy public folder (if exists)
if (Test-Path (Join-Path $rootDir "public")) {
    Copy-Item -Path (Join-Path $rootDir "public") -Destination $publishDir -Recurse -Force
}

# Copy prisma folder
Copy-Item -Path (Join-Path $rootDir "prisma") -Destination $publishDir -Recurse -Force

# Copy package.json, next.config.mjs
Copy-Item -Path (Join-Path $rootDir "package.json") -Destination $publishDir -Force
Copy-Item -Path (Join-Path $rootDir "next.config.mjs") -Destination $publishDir -Force

# 4. Copy IIS and Service configurations
Write-Host "[4/5] Copying web.config and server scripts..." -ForegroundColor Yellow
Copy-Item -Path (Join-Path $rootDir "web.config") -Destination $publishDir -Force
Copy-Item -Path (Join-Path $rootDir "web.reverse-proxy.config") -Destination $publishDir -Force
Copy-Item -Path (Join-Path $rootDir "server.iis.js") -Destination $publishDir -Force

if (Test-Path (Join-Path $rootDir ".env")) {
    Copy-Item -Path (Join-Path $rootDir ".env") -Destination (Join-Path $publishDir ".env.production") -Force
}

# Create quick start batch script for PM2 / Windows Service
$startBatContent = @"
@echo off
set NODE_ENV=production
set PORT=3000
npm run start
"@
Set-Content -Path (Join-Path $publishDir "start-server.bat") -Value $startBatContent

Write-Host "=============================================" -ForegroundColor Green
Write-Host " Publish Complete! Files ready in:" -ForegroundColor Green
Write-Host " $publishDir" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Green
