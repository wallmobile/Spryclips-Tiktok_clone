# PowerShell script to start backend server
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TikTok Clone Backend Server" -ForegroundColor Cyan
Write-Host "  Starting on port 5000..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$backendPath = Join-Path $PSScriptRoot "backend"
Set-Location $backendPath

Write-Host "Current directory: $backendPath" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "index.js")) {
    Write-Host "ERROR: index.js not found!" -ForegroundColor Red
    Write-Host "Please make sure you're running this from the project root." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Starting server..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start the server
node index.js

