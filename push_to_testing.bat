@echo off
echo === Testing branch par code push kar raha hoon ===
echo.

echo [1/4] Testing branch par switch kar raha hoon...
git checkout Testing
if errorlevel 1 (
    echo Testing branch nahi mili, bana raha hoon...
    git checkout -b Testing
)

echo.
echo [2/4] Sab code files add kar raha hoon (excluding .md files)...
git add .
git reset -- "*.md"

echo.
echo [3/4] Commit kar raha hoon...
git commit -m "Verification done"

echo.
echo [4/4] Testing branch par push kar raha hoon...
git push origin Testing

echo.
echo === Done! ===
pause
