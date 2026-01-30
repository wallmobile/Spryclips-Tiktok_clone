# Production Download Fix

## Problem
Download feature was failing in production with CORS error:
- Frontend (spryclips.com) was calling `http://localhost:5000` instead of production API
- 403 Forbidden error
- "No 'Access-Control-Allow-Origin' header" error

## Root Cause
1. **ActionBar.tsx** was using hardcoded `process.env.REACT_APP_API_URL || 'http://localhost:5000'`
2. This fallback to localhost doesn't work in production
3. Backend download endpoint needed explicit CORS headers

## Changes Made

### Frontend Fix
**File:** `frontend/src/components/common/ActionBar.tsx`

**Before:**
```typescript
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const downloadUrl = `${apiUrl}/api/videos/${videoId}/download`;
const response = await fetch(downloadUrl);
```

**After:**
```typescript
const apiUrl = (window as any).APP_CONFIG?.API_URL || process.env.REACT_APP_API_URL || '';
const downloadUrl = `${apiUrl}/api/videos/${videoId}/download`;
const response = await fetch(downloadUrl, {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Accept': 'video/mp4,video/*'
  }
});
```

### Backend Fix
**File:** `backend/routes/videos.js`

Added explicit CORS headers to the download endpoint:

```javascript
// Explicitly set CORS headers for download endpoint
const origin = req.headers.origin;
const allowedOrigins = [
  'http://localhost:3000',
  'https://spryclips.com',
  'https://www.spryclips.com'
];

if (origin && allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
```

## How It Works Now

### Development (localhost:3000)
- `window.APP_CONFIG.API_URL` = `http://localhost:5000`
- Download URL: `http://localhost:5000/api/videos/[id]/download`
- CORS: Allowed from localhost:3000

### Production (spryclips.com)
- `window.APP_CONFIG.API_URL` = `` (empty string, same-domain)
- Download URL: `/api/videos/[id]/download` (relative, proxied by Nginx)
- CORS: Allowed from spryclips.com
- Nginx proxy_pass to backend server

## Deployment Steps

### 1. Backend Deployment
```bash
cd /home/reactmaster/backend
git pull origin main
pm2 restart spryclips-backend
```

### 2. Frontend Deployment
```bash
cd /home/reactmaster/frontend
git pull origin main
npm run build
# Copy build files to nginx directory
sudo cp -r build/* /var/www/spryclips.com/html/
sudo systemctl reload nginx
```

### 3. Verify
1. Go to https://spryclips.com
2. Play any video
3. Click download button
4. Video should download without CORS error

## Testing Checklist
- [ ] Download works in development (localhost:3000)
- [ ] Download works in production (spryclips.com)
- [ ] No CORS errors in console
- [ ] Video file downloads with correct filename
- [ ] Private videos show proper error message
- [ ] Download works for both logged-in and guest users

## Related Files
- `frontend/src/components/common/ActionBar.tsx` - Download handler
- `frontend/public/config.js` - Runtime API URL detection
- `backend/routes/videos.js` - Download endpoint
- `backend/config/cors.js` - Global CORS configuration

## Notes
- Uses `window.APP_CONFIG.API_URL` for runtime configuration
- Includes credentials for authenticated requests
- Backend sets explicit CORS headers on download endpoint
- Works with Nginx proxy in production
