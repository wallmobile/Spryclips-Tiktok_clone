# Quick SSH Commands for Config.js Debugging

## 1️⃣ Search for ALL config.js files and show which ones have APP_CONFIG

```bash
ssh your-server 'find / -name "config.js" -type f 2>/dev/null | xargs grep -l "APP_CONFIG" 2>/dev/null'
```

## 2️⃣ Show content of all config.js files that contain APP_CONFIG

```bash
ssh your-server 'find / -name "config.js" -type f 2>/dev/null | while read f; do if grep -q "APP_CONFIG" "$f" 2>/dev/null; then echo "=== $f ==="; cat "$f"; echo ""; fi; done'
```

## 3️⃣ Check specific important locations

```bash
ssh your-server '
echo "=== Deployed (web root) ===";
cat /var/www/spryclips/config.js 2>/dev/null || echo "NOT FOUND";
echo "";
echo "=== Source (git repo) ===";
cat ~/Tiktok_clone/frontend/public/config.js 2>/dev/null || echo "NOT FOUND";
echo "";
echo "=== Build directory ===";
cat ~/Tiktok_clone/frontend/build/config.js 2>/dev/null || echo "NOT FOUND";
'
```

## 4️⃣ Clean ALL caches and force correct version

```bash
ssh your-server 'cd ~/Tiktok_clone && \
git fetch origin && \
git reset --hard origin/intial-code && \
cd frontend && \
rm -rf build node_modules package-lock.json && \
npm cache clean --force && \
cat public/config.js'
```

## 5️⃣ Complete cleanup and search (run the script)

```bash
# First, copy the script to server
scp ssh-cleanup-config.sh your-server:~/Tiktok_clone/

# Then run it
ssh your-server 'cd ~/Tiktok_clone && chmod +x ssh-cleanup-config.sh && ./ssh-cleanup-config.sh'
```

## 6️⃣ Nuclear option: Force overwrite config.js from git

```bash
ssh your-server '
cd ~/Tiktok_clone && \
git fetch origin && \
git checkout origin/intial-code -- frontend/public/config.js && \
echo "=== Config after git checkout ===" && \
cat frontend/public/config.js
'
```

## 7️⃣ Check if browser is caching the old file

After deployment, check these URLs in browser:
- `https://spryclips.com/config.js?v=1` (force fresh)
- `https://spryclips.com/config.js` (might be cached)

Or use curl to bypass browser cache:
```bash
curl https://spryclips.com/config.js
```

## 8️⃣ Full nuclear rebuild

```bash
ssh your-server 'cd ~/Tiktok_clone && \
git fetch origin && \
git reset --hard origin/intial-code && \
echo "=== Source config ===" && \
cat frontend/public/config.js && \
cd frontend && \
rm -rf build node_modules package-lock.json && \
npm cache clean --force && \
npm install && \
npm run build && \
echo "=== Built config ===" && \
cat build/config.js && \
sudo rm -rf /var/www/spryclips/* && \
sudo cp -r build/* /var/www/spryclips/ && \
echo "=== Deployed config ===" && \
sudo cat /var/www/spryclips/config.js'
```

## 🎯 Recommended Order

1. **First**: Run command #3 to see current state
2. **Second**: Run command #6 to force correct version from git
3. **Third**: Run command #8 for complete rebuild and deploy
4. **Finally**: Check with curl or browser at `/config.js`

## 🔍 What to Look For

**BAD** (will cause network errors):
```javascript
window.APP_CONFIG = {
  API_URL: 'http://localhost:5000'  // ❌ WRONG
};
```

**GOOD** (correct for production):
```javascript
window.APP_CONFIG = {
  API_URL: ''  // ✅ CORRECT
};
```
