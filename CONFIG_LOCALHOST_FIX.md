# Config.js Localhost Issue - Resolution Guide

## Issue Found
The test page at `https://spryclips.com/test-config.html` showed:
```json
{
  "window.APP_CONFIG": {
    "API_URL": "http://localhost:5000"
  }
}
```

This is **WRONG** for production. It should be:
```json
{
  "window.APP_CONFIG": {
    "API_URL": ""
  }
}
```

## Root Cause
The server had an **old version** of `frontend/public/config.js` that wasn't being updated during deployment. This could be due to:
1. Git pull not overwriting local changes
2. Cached old version of the file
3. Build process not picking up the updated config.js

## Solution Applied

### 1. Enhanced Deployment Script
Updated `deploy-production.sh` with:

**Before build - Source validation**:
```bash
print_step "Verifying config.js before build..."
if [ -f "public/config.js" ]; then
    echo "Source config.js contents:"
    cat public/config.js
    
    # Check if config.js contains localhost (wrong for production)
    if grep -q "localhost" public/config.js; then
        print_error "config.js contains 'localhost'! Update it to use empty string."
    fi
    echo "✓ config.js validated (no localhost references)"
fi
```

**After deployment - Deployed file validation**:
```bash
print_step "Verifying deployed config.js..."
if [ -f "$WEB_ROOT/config.js" ]; then
    cat "$WEB_ROOT/config.js"
    
    # Critical check: ensure config.js doesn't contain localhost
    if sudo grep -q "localhost" "$WEB_ROOT/config.js"; then
        print_error "DEPLOYMENT FAILED: config.js contains 'localhost'!"
    fi
    
    # Verify it has empty string
    if sudo grep -q "API_URL: ''" "$WEB_ROOT/config.js"; then
        echo "✓ API_URL is correctly set to empty string"
    fi
fi
```

**Added git reset for clean state**:
```bash
# Reset any local changes to ensure clean state
print_step "Resetting local changes..."
git reset --hard origin/intial-code
```

This ensures:
- Any local modifications are discarded
- The latest version from git is used
- Old cached files are overwritten

### 2. Deployment Will Now Fail Fast
If `config.js` is wrong, the deployment script will:
1. **STOP** with an error message before wasting time
2. Show exactly what's wrong
3. Prevent deploying broken configuration

## How to Deploy the Fix

### Step 1: SSH to Server
```bash
ssh your-server
```

### Step 2: Navigate to Project
```bash
cd ~/Tiktok_clone
```

### Step 3: Run Updated Deployment Script
```bash
./deploy-production.sh
```

### Step 4: Watch for Validation Output
You should see:
```
==> Verifying config.js before build...
Source config.js contents:
window.APP_CONFIG = {
  API_URL: '' // Empty = same domain
};

✓ config.js validated (no localhost references)

...building...

==> Verifying deployed config.js...
✓ Config.js found in web root
Contents:
window.APP_CONFIG = {
  API_URL: ''
};

✓ API_URL is correctly set to empty string
```

### Step 5: Verify After Deployment
Visit: `https://spryclips.com/test-config.html`

Should now show:
```json
{
  "window.APP_CONFIG": {
    "API_URL": ""
  },
  "window.location.origin": "https://spryclips.com",
  "Test": "PASS - config.js loaded"
}
```

### Step 6: Check Browser Console
Visit `https://spryclips.com` and open browser console.

Should see:
```
[Axios] Determining API URL...
[Axios] window.APP_CONFIG: {API_URL: ''}
[Axios] ✓ Using window.APP_CONFIG.API_URL: (empty string - same origin)
```

### Step 7: Verify Network Requests
In browser DevTools Network tab:
- Requests should go to `https://spryclips.com/api/videos`
- **NOT** to `http://localhost:5000/api/videos`

## If Deployment Still Shows Localhost

### Manual Fix on Server
```bash
# SSH to server
ssh your-server

# Navigate to project
cd ~/Tiktok_clone

# Force pull latest config.js
git fetch origin
git checkout origin/intial-code -- frontend/public/config.js

# Verify it's correct
cat frontend/public/config.js

# Should show:
# window.APP_CONFIG = {
#   API_URL: ''
# };

# Rebuild frontend only
cd frontend
rm -rf build node_modules
npm install
npm run build

# Deploy to web root
sudo rm -rf /var/www/spryclips/*
sudo cp -r build/* /var/www/spryclips/

# Verify deployed version
cat /var/www/spryclips/config.js

# Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
```

### Clear Browser Cache
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
4. Or use incognito/private window

## Prevention

The updated deployment script now:
1. ✅ Does `git reset --hard` to ensure clean state
2. ✅ Validates source `config.js` before building
3. ✅ Validates deployed `config.js` after copying
4. ✅ Fails immediately if localhost is detected
5. ✅ Shows git commit history to verify latest code

## Files Changed
- `deploy-production.sh` - Added validation and git reset
- `frontend/public/config.js` - Already correct in git (has empty string)

## Commit Reference
```
5e6d6e8 - Improve deployment script: add config.js validation and git reset
e20e538 - Add comprehensive documentation for axios config fix
7e6417f - Fix axios config detection and improve deployment debugging
```

## Expected Result After Fix
- ✅ Test page shows `API_URL: ""`
- ✅ Browser console shows using empty string
- ✅ API requests go to `https://spryclips.com/api/...`
- ✅ No CORS errors
- ✅ No network errors
- ✅ Application works correctly

## Debug Commands

**Check deployed config.js**:
```bash
ssh your-server "cat /var/www/spryclips/config.js"
```

**Check source config.js in git**:
```bash
ssh your-server "cat ~/Tiktok_clone/frontend/public/config.js"
```

**Check last commit**:
```bash
ssh your-server "cd ~/Tiktok_clone && git log -1 --oneline"
```

**Check when config.js was last updated**:
```bash
ssh your-server "cd ~/Tiktok_clone && git log -1 --oneline -- frontend/public/config.js"
```

## Summary
The issue was that the server had an old cached version of `config.js` with `localhost:5000`. The enhanced deployment script now:
1. Forces a clean git state with `git reset --hard`
2. Validates the config before and after deployment
3. Fails fast if wrong config is detected
4. Shows clear error messages

Run the updated deployment script and the issue should be resolved! 🚀
