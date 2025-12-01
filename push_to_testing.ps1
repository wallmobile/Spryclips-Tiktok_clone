# Push code to Testing branch (excluding .md files)

Write-Host "=== Switching to Testing branch ===" -ForegroundColor Cyan
git checkout Testing 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Testing branch not found, creating it..." -ForegroundColor Yellow
    git checkout -b Testing
}

Write-Host "`n=== Adding all code files (excluding .md and node_modules) ===" -ForegroundColor Cyan
git add .
git reset -- '*.md'

Write-Host "`n=== Checking what will be committed ===" -ForegroundColor Cyan
git status --short

Write-Host "`n=== Committing changes ===" -ForegroundColor Cyan
git commit -m "Verification done"

Write-Host "`n=== Pushing to Testing branch ===" -ForegroundColor Cyan
git push origin Testing

Write-Host "`n=== Done! ===" -ForegroundColor Green
