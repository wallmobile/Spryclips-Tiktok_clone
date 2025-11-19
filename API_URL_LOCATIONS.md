# 🔍 All API_URL Configuration Locations in Codebase

## Summary
The codebase has **multiple locations** where API_URL is configured or hardcoded. Some of these duplicate the logic from `axios.ts` but **don't use `window.APP_CONFIG`**, which means they won't pick up the runtime configuration from `config.js`.

---

## ✅ PRIMARY CONFIGURATION (Correct)

### 1. **`frontend/public/config.js`** ⭐ (Runtime Config - Correct)
```javascript
window.APP_CONFIG = {
  API_URL: '' // Empty = same domain (nginx will proxy /api to backend)
};
```
**Status**: ✅ **Correct** - This is the main source of truth for production.

### 2. **`frontend/src/config/axios.ts`** ⭐ (Main axios client - Fixed)
```typescript
const getAPIURL = (): string => {
  // Priority 1: Runtime config from window.APP_CONFIG
  if (isBrowser && window.APP_CONFIG && 'API_URL' in window.APP_CONFIG) {
    return window.APP_CONFIG.API_URL || '';
  }
  // Priority 2: Build-time env
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // Priority 3: Auto-detect
  // ...
}
```
**Status**: ✅ **Fixed** - Now correctly prioritizes `window.APP_CONFIG.API_URL`

---

## ⚠️ PROBLEMATIC LOCATIONS (Need Fixing)

### 3. **`frontend/src/hooks/useSocket.js`** ❌ (Missing window.APP_CONFIG)
**Current Code** (Lines 7-20):
```javascript
const getSocketURL = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(origin)) {
      return 'http://localhost:5000';  // ❌ Hardcoded localhost
    }
    return origin;
  }
  return 'http://localhost:5000';  // ❌ Hardcoded localhost
};
```

**Problem**: 
- Does NOT check `window.APP_CONFIG.API_URL`
- Falls back to `localhost:5000` in development
- In production, will use `window.location.origin` which is correct, BUT inconsistent with axios.ts logic

**Fix Needed**: Add `window.APP_CONFIG.API_URL` check as Priority 1

---

### 4. **`frontend/src/components/Following.js`** ⚠️ (Partial - Missing fallback logic)
**Current Code** (Lines 10-21):
```javascript
const getMediaBase = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  const configBase = window.APP_CONFIG?.API_URL;
  if (configBase) {  // ⚠️ Will skip if empty string!
    return configBase;
  }
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  return window.location?.origin || '';
};
```

**Problem**: 
- Uses `if (configBase)` which is **falsy** for empty string `''`
- Should check `'API_URL' in window.APP_CONFIG` instead

**Fix Needed**: Change to `if (window.APP_CONFIG && 'API_URL' in window.APP_CONFIG)`

---

### 5. **`frontend/src/components/Explore.js`** ❌ (Missing window.APP_CONFIG)
**Current Code** (Lines 140-146):
```javascript
const base =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');
```

**Problem**: 
- Does NOT check `window.APP_CONFIG.API_URL` at all
- Will always use `process.env.REACT_APP_API_URL` or `window.location.origin`

**Fix Needed**: Add `window.APP_CONFIG?.API_URL` check as Priority 1

---

### 6. **`frontend/src/components/WatchLater.js`** ❌ (Missing window.APP_CONFIG)
**Current Code** (Lines 147-150):
```javascript
const base =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');
```

**Problem**: Same as Explore.js - missing `window.APP_CONFIG.API_URL` check

**Fix Needed**: Add `window.APP_CONFIG?.API_URL` check as Priority 1

---

### 7. **`frontend/src/components/Profile.js`** ✅ (Uses imported API_URL)
**Current Code** (Line 6):
```javascript
import api, { API_URL } from '../config/axios';
```

**Status**: ✅ **Correct** - Imports from axios.ts, so will use correct config

---

### 8. **`frontend/src/api/videos.js`** ✅ (Uses imported API_URL)
**Current Code** (Line 1):
```javascript
import api, { API_URL } from '../config/axios';
```

**Status**: ✅ **Correct** - Imports from axios.ts, so will use correct config

---

## 🔧 BACKEND CONFIGURATIONS (These are fine)

### 9. **`backend/routes/collections.js`** (Line 33)
```javascript
const baseUrl = process.env.API_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
```
**Status**: ✅ **OK** - Backend uses env vars, not frontend config

### 10. **`backend/routes/recommendations.js`** (Line 283)
Same as above - uses backend env vars

### 11. **`backend/utils/swagger.js`** (Line 18)
```javascript
url: process.env.API_URL || 'http://localhost:5000',
```
**Status**: ✅ **OK** - Backend uses env vars

---

## 📋 RECOMMENDED FIXES

### Fix Priority Order:

1. **🔴 HIGH PRIORITY - useSocket.js**
   - Used for WebSocket connections
   - Currently hardcoded to localhost:5000
   - **Fix**: Add `window.APP_CONFIG.API_URL` check

2. **🟠 MEDIUM PRIORITY - Following.js**
   - Used for media URL resolution
   - Has `window.APP_CONFIG.API_URL` but checks it incorrectly
   - **Fix**: Change `if (configBase)` to `if (window.APP_CONFIG && 'API_URL' in window.APP_CONFIG)`

3. **🟡 MEDIUM PRIORITY - Explore.js & WatchLater.js**
   - Used for media URL resolution in specific components
   - Missing `window.APP_CONFIG.API_URL` check entirely
   - **Fix**: Add `window.APP_CONFIG?.API_URL` as Priority 1

---

## 🎯 PROPOSED FIX PATTERN

All frontend files should use this consistent pattern:

```javascript
const getAPIURL = () => {
  // Priority 1: Runtime config (from public/config.js)
  if (typeof window !== 'undefined' && window.APP_CONFIG && 'API_URL' in window.APP_CONFIG) {
    return window.APP_CONFIG.API_URL || '';
  }
  
  // Priority 2: Build-time env
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Priority 3: Auto-detect
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    // Dev: localhost
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(origin)) {
      return 'http://localhost:5000';
    }
    // Prod: same origin
    return origin;
  }
  
  // Fallback
  return '';
};
```

---

## 🚨 WHY THIS MATTERS

If these files don't check `window.APP_CONFIG.API_URL`, they will:

1. **useSocket.js**: WebSocket connections will try to connect to wrong server
2. **Following.js**: Media URLs might be constructed incorrectly
3. **Explore.js**: Video thumbnails/URLs might be wrong
4. **WatchLater.js**: Saved video URLs might be wrong

Even though the main axios client is fixed, these components have their own URL resolution logic that bypasses axios.

---

## ✅ ACTION ITEMS

1. Fix `frontend/src/hooks/useSocket.js` - Add `window.APP_CONFIG.API_URL` check
2. Fix `frontend/src/components/Following.js` - Change condition to check key existence
3. Fix `frontend/src/components/Explore.js` - Add `window.APP_CONFIG.API_URL` check
4. Fix `frontend/src/components/WatchLater.js` - Add `window.APP_CONFIG.API_URL` check
5. Test all fixes with deployment script
6. Verify WebSocket connections work in production
7. Verify media URLs are correct in all components

---

## 📝 FILES TO UPDATE

```
frontend/src/hooks/useSocket.js
frontend/src/components/Following.js
frontend/src/components/Explore.js
frontend/src/components/WatchLater.js
```

These 4 files need to be updated to consistently check `window.APP_CONFIG.API_URL` first, just like `axios.ts` does.
