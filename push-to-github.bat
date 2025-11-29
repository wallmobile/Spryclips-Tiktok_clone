@echo off
echo ========================================
echo Pushing Latest Code to GitHub
echo ========================================
echo.

cd /d "C:\Users\Waqas\Desktop\Tiktok_clone"

echo Step 1: Cleaning up swap files and rebase issues...
del /f /q ".git\.COMMIT_EDITMSG.swp" 2>nul
del /f /q ".git\COMMIT_EDITMSG.swp" 2>nul
git rebase --abort 2>nul
echo.

echo Step 2: Setting git editor to avoid vim...
git config core.editor "notepad"
git config --global core.editor "notepad"
echo.

echo Step 3: Checking git status...
git status
echo.

echo Step 4: Adding all changes...
git add .
echo.

echo Step 5: Committing changes...
git commit -m "Add latest features: Business Tools, Ad Manager, Product Catalog, Business Messaging, Activity Center, Manage Account, Delete Account with full backend integration"
echo.

echo Step 6: Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo Trying master branch...
    git push origin master
)
echo.

echo ========================================
echo Done! Code pushed to GitHub
echo ========================================
pause

