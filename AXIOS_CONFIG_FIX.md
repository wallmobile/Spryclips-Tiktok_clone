# Axios Config Fix - Deployment Instructions

## Problem
The frontend was using `baseURL: "http://localhost:5000"` in production instead of using the nginx proxy at `/api/`. This caused CORS errors and network failures.

## Root Cause
The axios configuration logic was not correctly detecting and prioritizing the `window.APP_CONFIG.API_URL` value from `config.js`. The check `if (isBrowser && window.APP_CONFIG?.API_URL !== undefined)` would fail when `API_URL` was an empty string because:
1. The optional chaining would evaluate to `window.APP_CONFIG.API_URL`
2. An empty string `''` is falsy in JavaScript
3. So `window.APP_CONFIG?.API_URL !== undefined` would be `true`, but the code would still not use it correctly

## Fix Applied

### 1. Improved axios.ts config detection
**File**: `frontend/src/config/axios.ts`

**Changes**:
- Changed condition from `window.APP_CONFIG?.API_URL !== undefined` to `window.APP_CONFIG && 'API_URL' in window.APP_CONFIG`
- This properly checks if the key exists, regardless of the value (including empty strings)
- Added comprehensive logging to show exactly which config source is being used
- Added visual indicators (✓) in logs to make it clear which path was taken

**Result**: The config will now correctly use an empty string from `window.APP_CONFIG.API_URL` instead of falling back to localhost detection.

### 2. Added test page
**File**: `frontend/public/test-config.html`

This page helps verify that config.js is loading correctly. Access it at:
```
https://spryclips.com/test-config.html
```

It will show:
- The full `window.APP_CONFIG` object
- The current origin
- Whether config.js loaded successfully

### 3. Enhanced deployment script
**File**: `deploy-production.sh`

**Changes**:
- Added verification of config.js contents after deployment
- Added grep to specifically check the API_URL value
- Added check for test-config.html presence

## Deployment Steps

1. **SSH to your server**:
   ```bash
   ssh your-server
   ```

2. **Navigate to project directory**:
   ```bash
   cd /path/to/Tiktok_clone
   ```

3. **Pull latest changes**:
   ```bash
   git pull origin intial-code
   ```

4. **Run deployment script**:
   ```bash
   chmod +x deploy-production.sh
   ./deploy-production.sh
   ```

5. **Watch for these key outputs**:
   ```
   ✓ Config.js found in web root
   Contents:
   window.APP_CONFIG = {
     API_URL: ''
   };
   
   Checking API_URL value:
   API_URL: ''  <-- Should show empty string
   ```

## Post-Deployment Verification

### 1. Check config loading
Visit: `https://spryclips.com/test-config.html`

Expected output:
```json
{
  "window.APP_CONFIG": {
    "API_URL": ""
  },
  "window.location.origin": "https://spryclips.com",
  "Test": "PASS - config.js loaded"
}
```

### 2. Check browser console logs
Open `https://spryclips.com` and check the browser console. You should see:
```
[Axios] Determining API URL...
[Axios] window.APP_CONFIG: {API_URL: ''}
[Axios] process.env.REACT_APP_API_URL: undefined
[Axios] window.location.origin: https://spryclips.com
[Axios] ✓ Using window.APP_CONFIG.API_URL: (empty string - same origin)
```

**NOT**:
```
[Axios] ✓ Development mode detected, using localhost:5000
```

### 3. Check network requests
In the browser DevTools Network tab:
- API requests should go to `https://spryclips.com/api/...`
- They should NOT go to `http://localhost:5000/api/...`

### 4. Check backend logs
```bash
pm2 logs tiktok-backend
```

Look for:
- `CORS Configuration: Allowed origins: https://spryclips.com,https://www.spryclips.com`
- No blocked CORS requests
- Successful API requests

### 5. Test API endpoint
```bash
curl -I https://spryclips.com/api/health
```

Should return:
```
HTTP/1.1 200 OK
```

## What Was Changed

### frontend/src/config/axios.ts
```typescript
// OLD (broken):
if (isBrowser && window.APP_CONFIG?.API_URL !== undefined) {
  // This wouldn't work correctly with empty string
}

// NEW (fixed):
if (isBrowser && window.APP_CONFIG && 'API_URL' in window.APP_CONFIG) {
  const url = window.APP_CONFIG.API_URL || '';
  console.log('[Axios] ✓ Using window.APP_CONFIG.API_URL:', 
    url === '' ? '(empty string - same origin)' : url);
  return url;
}
```

### frontend/public/config.js
```javascript
// This is correct and should remain as-is:
window.APP_CONFIG = {
  API_URL: '' // Empty = same domain (nginx will proxy /api to backend)
};
```

## Troubleshooting

### If frontend still uses localhost:5000

1. **Clear browser cache**:
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or clear cache in DevTools

2. **Verify config.js on server**:
   ```bash
   cat /var/www/spryclips/config.js
   ```
   Should show `API_URL: ''`

3. **Check if test-config.html works**:
   Visit https://spryclips.com/test-config.html
   If it shows API_URL as empty string but main app doesn't work, there might be a caching issue

4. **Check build output**:
   ```bash
   ls -la /var/www/spryclips/
   ```
   Verify index.html and config.js exist and have recent timestamps

### If you see CORS errors

1. **Check PM2 environment variables**:
   ```bash
   pm2 env 0
   ```
   Look for `ALLOWED_ORIGINS` and `FRONTEND_URL`

2. **Check backend logs**:
   ```bash
   pm2 logs tiktok-backend --lines 100
   ```
   Look for blocked origin messages

3. **Verify nginx is proxying correctly**:
   ```bash
   curl -I http://127.0.0.1:5000/api/health  # Direct to backend
   curl -I http://localhost/api/health        # Through nginx
   ```
   Both should return 200 OK

## Expected Final State

After successful deployment:

✅ Frontend serves from `/var/www/spryclips`
✅ `config.js` has `API_URL: ''`
✅ Browser console shows: `Using window.APP_CONFIG.API_URL: (empty string - same origin)`
✅ API requests go to `https://spryclips.com/api/...`
✅ Nginx proxies `/api/*` to `http://127.0.0.1:5000`
✅ Backend allows CORS from `https://spryclips.com`
✅ No CORS errors in browser console
✅ No network errors in browser console

## Files Modified
- `frontend/src/config/axios.ts` - Fixed config detection logic
- `frontend/public/test-config.html` - Added config test page
- `deploy-production.sh` - Enhanced verification
- `setup-git-credentials.sh` - Git credential helper (optional)

## Next Steps
1. Deploy using the updated script
2. Visit test-config.html to verify config loading
3. Check browser console logs
4. Test the application functionality
5. Monitor PM2 logs for any issues

If issues persist after these steps, check the troubleshooting section above.
