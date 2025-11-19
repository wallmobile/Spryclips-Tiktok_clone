# 🚨 CRITICAL: Two Web Root Directories Found!

## Problem Discovered

Your server has **TWO** frontend deployment locations:

1. **`/var/www/spryclips`** ← Deployment script uses this
2. **`/var/www/html`** ← Old/default location with OLD config.js

## Which One is Nginx Serving?

Check your nginx config to see which `root` directive is active.

---

## Quick Fix Commands

### 1️⃣ Check which directory nginx is using

```bash
ssh your-server 'sudo grep "root /var/www" /etc/nginx/sites-available/default'
```

Expected output should show:
```
root /var/www/spryclips;
```

If it shows `/var/www/html`, that's the problem!

---

### 2️⃣ Check both locations

```bash
ssh your-server '
echo "=== /var/www/spryclips/config.js ===";
cat /var/www/spryclips/config.js 2>/dev/null || echo "NOT FOUND";
echo "";
echo "=== /var/www/html/config.js ===";
cat /var/www/html/config.js 2>/dev/null || echo "NOT FOUND";
'
```

---

### 3️⃣ Fix BOTH locations (Nuclear option)

```bash
ssh your-server '
# Go to project
cd ~/Tiktok_clone

# Pull latest
git fetch origin
git reset --hard origin/intial-code

# Show source is correct
echo "=== Source config.js ==="
cat frontend/public/config.js

# Rebuild
cd frontend
rm -rf build node_modules package-lock.json
npm cache clean --force
npm install
npm run build

# Deploy to BOTH locations to be safe
echo ""
echo "=== Deploying to /var/www/spryclips ==="
sudo rm -rf /var/www/spryclips/*
sudo cp -r build/* /var/www/spryclips/
sudo chown -R www-data:www-data /var/www/spryclips
sudo chmod -R 755 /var/www/spryclips

echo ""
echo "=== Deploying to /var/www/html ==="
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

echo ""
echo "=== Verify both locations ==="
echo "spryclips config.js:"
sudo cat /var/www/spryclips/config.js | grep "API_URL"
echo ""
echo "html config.js:"
sudo cat /var/www/html/config.js | grep "API_URL"
'
```

---

### 4️⃣ Remove /var/www/html entirely (if not needed)

```bash
ssh your-server '
# Backup first
sudo mv /var/www/html /var/www/html.backup.$(date +%Y%m%d)

# Verify nginx uses spryclips
sudo grep "root /var/www" /etc/nginx/sites-available/default

# Restart nginx
sudo systemctl restart nginx
'
```

---

## Update Deployment Script

We need to update `deploy-production.sh` to clean BOTH directories:

```bash
# Add this after the existing cleanup
print_step "Cleaning ALL web root locations..."
sudo rm -rf "$WEB_ROOT"/*
sudo mkdir -p "$WEB_ROOT"

# Also clean /var/www/html if it exists
if [ -d "/var/www/html" ]; then
    print_warn "Found /var/www/html - cleaning it too"
    sudo rm -rf /var/www/html/*
fi
```

---

## Recommended Action

**Run this NOW**:

```bash
ssh your-server 'cd ~/Tiktok_clone && git pull origin intial-code && ./deploy-production.sh'
```

Then manually verify and clean `/var/www/html`:

```bash
ssh your-server '
echo "Checking nginx config...";
sudo grep "root /var/www" /etc/nginx/sites-available/default;
echo "";
echo "Contents of /var/www/html:";
ls -la /var/www/html/;
echo "";
echo "If nginx uses spryclips, we can remove html:";
echo "sudo mv /var/www/html /var/www/html.backup";
'
```

---

## Why This Happened

1. **Default nginx** uses `/var/www/html`
2. **Your deployment** uses `/var/www/spryclips`
3. **Old config.js** is in `/var/www/html`
4. **Browser/nginx** might be serving from wrong location

---

## After Fix

1. Visit: `https://spryclips.com/config.js`
2. Should show: `API_URL: ''`
3. Check test page: `https://spryclips.com/test-config.html`
4. Should show: `"API_URL": ""`

If it still shows localhost, the browser is definitely serving from `/var/www/html` (the old location)!
