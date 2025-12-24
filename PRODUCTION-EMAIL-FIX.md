# Production Email Configuration Fix

## Problem
Verification emails are not being sent on production server.

## Root Cause
Environment variables (EMAIL_SERVICE, GMAIL_USER, GMAIL_APP_PASSWORD) are not being set in the PM2 process on production.

## Solution

### Step 1: SSH into Production Server
```bash
ssh reactmaster@spryclips.com
# OR
ssh reactmaster@134.209.150.133
```

### Step 2: Navigate to Project Directory
```bash
cd ~/Tiktok_clone
```

### Step 3: Test Current Email Configuration
```bash
cd backend
node test-email-production.js
```

This will show:
- ✅ Which environment variables are set
- ❌ Which are missing
- 📧 Test email sending

### Step 4: Set Environment Variables in PM2

If variables are missing, you have two options:

#### Option A: Set in PM2 Ecosystem (Recommended)
Edit `backend/ecosystem.config.js`:

```javascript
env_production: {
  NODE_ENV: 'production',
  PORT: 5000,
  EMAIL_SERVICE: 'gmail',
  EMAIL_FROM: 'SpryClips <bipul.kumar3384@gmail.com>',
  GMAIL_USER: 'bipul.kumar3384@gmail.com',
  GMAIL_APP_PASSWORD: 'szynffjxrpripdhm'
},
```

Then restart PM2:
```bash
pm2 delete all
pm2 start ecosystem.config.js --env production
pm2 save
```

#### Option B: Use Deploy Script (Already Fixed)
The `deploy-production.sh` script already has the email variables added. Just run:

```bash
cd ~/Tiktok_clone
./deploy-production.sh
```

This will deploy with email configuration automatically.

### Step 5: Verify Email is Working

After deployment, test again:
```bash
cd ~/Tiktok_clone/backend
node test-email-production.js
```

You should see:
```
✅ TEST EMAIL SENT SUCCESSFULLY!
Message ID: <some-id@gmail.com>
From: SpryClips <bipul.kumar3384@gmail.com>
To: bipul.kumar3384@gmail.com
```

### Step 6: Check PM2 Logs

View real-time logs:
```bash
pm2 logs spryclips-blue
# OR
pm2 logs spryclips-green
```

When someone signs up, you should see:
```
📧 Attempting to send verification email
✅ Email sent successfully via Gmail SMTP!
Message ID: <some-id@gmail.com>
```

### Step 7: Test Live Signup

1. Go to https://spryclips.com
2. Try to sign up with a real email
3. Check that email for verification code
4. Check PM2 logs: `pm2 logs`

## Quick Fix Command (Run on Server)

```bash
# Stop all PM2 processes
pm2 stop all

# Start with environment variables
cd ~/Tiktok_clone/backend
EMAIL_SERVICE=gmail \
EMAIL_FROM="SpryClips <bipul.kumar3384@gmail.com>" \
GMAIL_USER=bipul.kumar3384@gmail.com \
GMAIL_APP_PASSWORD=szynffjxrpripdhm \
NODE_ENV=production \
PORT=5000 \
pm2 start index.js --name spryclips --update-env

# Save PM2 configuration
pm2 save
```

## Verification Checklist

- [ ] SSH into production server
- [ ] Run `node test-email-production.js` to check config
- [ ] Environment variables are set (EMAIL_SERVICE, GMAIL_USER, GMAIL_APP_PASSWORD)
- [ ] PM2 process is running with correct env vars
- [ ] Test email sent successfully
- [ ] Live signup sends verification code to email
- [ ] PM2 logs show "Email sent successfully"

## Troubleshooting

### If test email fails:

1. **Check Gmail App Password**
   - Must be 16 characters, no spaces
   - Generated from Google Account > Security > 2-Step Verification > App Passwords

2. **Check Server Firewall**
   ```bash
   # Test SMTP connection
   telnet smtp.gmail.com 587
   # OR
   nc -zv smtp.gmail.com 587
   ```

3. **Check PM2 Environment**
   ```bash
   pm2 show spryclips-blue
   # Look for "env:" section
   ```

4. **Check Logs**
   ```bash
   pm2 logs --lines 100
   ```

## Support

If still not working:
1. Share output of `node test-email-production.js`
2. Share PM2 logs: `pm2 logs --lines 50`
3. Check if email appears in backend logs when signup happens
