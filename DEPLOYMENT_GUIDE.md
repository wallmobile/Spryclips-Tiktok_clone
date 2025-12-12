# Deployment Guide for Admin Login Fix

## Quick Deployment Steps

### For Production Server (spryclips.com)

1. **SSH into the production server**:
   ```bash
   ssh reactmaster@spryclips.com
   ```

2. **Navigate to the project directory**:
   ```bash
   cd /home/reactmaster
   ```

3. **Pull the latest changes**:
   ```bash
   git pull origin main
   # or if changes are in a different branch:
   git pull origin copilot/fix-admin-user-login
   ```

4. **Install any new dependencies** (if needed):
   ```bash
   cd backend
   npm install
   cd ..
   ```

5. **Restart the backend server**:
   
   If using PM2:
   ```bash
   pm2 restart backend
   # or
   pm2 restart all
   ```
   
   If using systemd:
   ```bash
   sudo systemctl restart tiktok-backend
   ```
   
   If running manually:
   ```bash
   cd backend
   npm start
   ```

6. **Verify the fix**:
   
   Check server logs for admin user creation:
   ```bash
   pm2 logs backend
   # or
   tail -f /path/to/backend.log
   ```
   
   You should see:
   ```
   ✅ MongoDB connected: cluster0.q6qrciv.mongodb.net
   ✅ Admin user exists and is properly configured
   ```
   or
   ```
   ⚠️  Admin user not found. Creating...
   ✅ Admin user created successfully!
   ```

7. **Test the login**:
   ```bash
   curl -X POST https://spryclips.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@spryclips.com","password":"Admin@123456"}'
   ```
   
   Expected successful response:
   ```json
   {
     "success": true,
     "user": {
       "id": "...",
       "username": "admin",
       "email": "admin@spryclips.com",
       "role": "admin"
     },
     "token": "...",
     "refreshToken": "..."
   }
   ```

## Alternative: Manual Script Execution

If you prefer to manually create/fix the admin user without restarting:

```bash
cd /home/reactmaster/backend
NODE_ENV=production node scripts/checkAdminUser.js
```

This will:
- Check if admin user exists
- Test the password
- Automatically fix any issues
- Create the user if missing

## Verification Checklist

- [ ] Backend server restarted successfully
- [ ] MongoDB connection established (check logs)
- [ ] Admin user creation message in logs
- [ ] Login API returns success response
- [ ] Admin can access admin panel in UI

## Rollback Procedure

If something goes wrong:

1. **Check the logs first**:
   ```bash
   pm2 logs backend --lines 100
   ```

2. **Revert to previous version**:
   ```bash
   git log --oneline -5  # Find the commit to revert to
   git checkout <previous-commit-hash>
   pm2 restart backend
   ```

3. **Or manually reset admin user using MongoDB**:
   ```bash
   mongosh "mongodb+srv://admin:tR0hD8ODPxICuafh@cluster0.q6qrciv.mongodb.net/tiktok-clone"
   ```
   
   Then in MongoDB shell:
   ```javascript
   use tiktok-clone
   db.users.findOne({ email: "admin@spryclips.com" })
   // Manually update if needed
   ```

## Troubleshooting

### Issue: Server won't start
**Check**:
- MongoDB connection string is correct
- JWT_SECRET is set
- Port 5000 is available

### Issue: Admin user still can't login
**Run diagnostic**:
```bash
cd /home/reactmaster/backend
NODE_ENV=production node scripts/verifyAdminLogin.js
```

### Issue: MongoDB connection failed
**Verify**:
- MongoDB Atlas is accessible
- Credentials are correct in `.env.production`
- Network firewall allows connection

### Issue: Changes not taking effect
**Clear cache and restart**:
```bash
pm2 delete all
pm2 start ecosystem.config.js --env production
```

## Support Commands

```bash
# Check server status
pm2 status

# View real-time logs
pm2 logs backend

# Restart specific app
pm2 restart backend

# View detailed process info
pm2 show backend

# Monitor CPU/memory
pm2 monit
```

## Environment Variables to Verify

Ensure these are set in `.env.production`:
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://admin:tR0hD8ODPxICuafh@cluster0.q6qrciv.mongodb.net/tiktok-clone?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=spryclips-production-secret-key-change-this-random-string-xyz123
PORT=5000
FRONTEND_URL=https://spryclips.com
```

## Post-Deployment Testing

1. **Test admin login via UI**: Navigate to `https://spryclips.com/login` and login with admin credentials
2. **Test API directly**: Use the curl command above
3. **Check admin panel access**: Verify admin can access admin-only features
4. **Monitor logs**: Watch for any errors in the first few minutes

## Success Criteria

✅ Backend server running without errors  
✅ MongoDB connected successfully  
✅ Admin user exists in database  
✅ Admin login returns success  
✅ Admin can access admin panel  
✅ No errors in server logs
