Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pushing Latest Code to GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "C:\Users\Waqas\Desktop\Tiktok_clone"

Write-Host "Step 1: Checking git status..." -ForegroundColor Yellow
git status
Write-Host ""

Write-Host "Step 2: Adding all changes..." -ForegroundColor Yellow
git add .
Write-Host ""

Write-Host "Step 3: Committing changes..." -ForegroundColor Yellow
git commit -m "Add latest features: Business Tools, Ad Manager, Product Catalog, Business Messaging, Activity Center, Manage Account, Delete Account with full backend integration"
Write-Host ""

Write-Host "Step 4: Pushing to GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Trying master branch..." -ForegroundColor Yellow
    git push origin master
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "Done! Code pushed to GitHub" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Read-Host "Press Enter to exit"

