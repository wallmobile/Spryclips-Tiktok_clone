# 🚨 IMMEDIATE FIX - Two Web Roots Problem

## THE PROBLEM

Your server has **TWO** web directories:
- `/var/www/spryclips` ← Where deployment script puts files
- `/var/www/html` ← **WHERE NGINX IS ACTUALLY SERVING FROM** (with OLD config.js)

That's why you see `API_URL: 'http://localhost:5000'` when you visit the site!

---

## 🎯 RUN THIS NOW (One Command)

```bash
ssh your-server 'cd ~/Tiktok_clone && \
git pull origin intial-code && \
./deploy-production.sh'
```

**What this does**:
- ✅ Pulls latest deployment script
- ✅ Cleans `/var/www/spryclips`
- ✅ Cleans `/var/www/html` (the old location)
- ✅ Deploys to **BOTH** locations
- ✅ Shows which root nginx is using
- ✅ Tests config.js via curl

---

## 📊 Expected Output

You'll see:
```
==> Cleaning web root...
WARNING: Found /var/www/html (old deployment location) - cleaning it too

==> Deploying frontend to web root...
==> Also deploying to /var/www/html for consistency...

==> Verifying nginx config was written...
Checking web root directive:
root /var/www/spryclips;  ← Should show this

==> Testing config.js via nginx:
  API_URL: ''  ← Should show empty string!
```

---

## ✅ Verify It Worked

### 1. Via curl (no cache)
```bash
curl https://spryclips.com/config.js
```

Should show:
```javascript
window.APP_CONFIG = {
  API_URL: ''  // ✅ Empty string
};
```

### 2. Via browser
Visit: `https://spryclips.com/config.js?nocache=1`

Should show same as above.

### 3. Test page
Visit: `https://spryclips.com/test-config.html?v=3`

Should show:
```json
{
  "window.APP_CONFIG": {
    "API_URL": ""
  }
}
```

### 4. Hard refresh main site
- Chrome/Firefox: `Cmd+Shift+R` or `Ctrl+Shift+R`
- Or use incognito window

---

## 🔍 If Still Shows localhost

Check which directory nginx is REALLY using:

```bash
ssh your-server '
echo "=== Nginx Config ===";
sudo grep "root /var/www" /etc/nginx/sites-available/default;
echo "";
echo "=== spryclips config.js ===";
sudo cat /var/www/spryclips/config.js | grep API_URL;
echo "";
echo "=== html config.js ===";
sudo cat /var/www/html/config.js | grep API_URL;
'
```

Both should now show `API_URL: ''`

---

## 🎉 Why This Will Work

The updated deployment script now:
1. ✅ Deploys to `/var/www/spryclips` (primary)
2. ✅ **ALSO deploys to `/var/www/html`** (backup/old location)
3. ✅ Verifies nginx root directive
4. ✅ Tests config.js via curl
5. ✅ Shows exactly what nginx will serve

**No matter which directory nginx uses, it will have the correct config.js!**

---

## 📝 Next Steps

1. **Deploy now** with the command above
2. **Check curl** output shows `API_URL: ''`
3. **Hard refresh** browser
4. **Test the app** - should work!

**Ready to go!** 🚀
