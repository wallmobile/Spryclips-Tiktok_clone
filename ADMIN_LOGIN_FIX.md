# Admin Login Issue Fix

## Problem
Admin login at `https://spryclips.com/api/auth/login` was failing with:
- **Email**: `admin@spryclips.com`
- **Password**: `Admin@123456`
- **Error**: "Invalid email or password. Please check your credentials and try again."

## Root Cause
The admin user either:
1. Didn't exist in the MongoDB database
2. Had incorrect password hash
3. Was locked due to failed login attempts
4. Had incorrect authProvider (not 'local')
5. Had incorrect accountStatus (not 'active')

## Solution Implemented

### 1. Automatic Admin User Creation on Startup
The backend now automatically ensures the admin user exists and is properly configured when the server starts.

**File**: `backend/utils/ensureAdminUser.js`
- Creates admin user if it doesn't exist
- Updates existing admin user to correct configuration
- Resets password to ensure it's correct
- Clears any account locks
- Ensures role is 'admin', authProvider is 'local', and accountStatus is 'active'

**Integration**: `backend/index.js`
- Calls `ensureAdminUser()` after MongoDB connection is established
- Runs non-blocking to prevent server startup delays

### 2. Improved Admin User Scripts

#### checkAdminUser.js
**Updated**: `backend/scripts/checkAdminUser.js`
- Case-insensitive email search
- Tests password hash
- Automatically fixes password if incorrect
- Displays detailed user information
- Supports both production and development environments

**Usage**:
```bash
# For production MongoDB
NODE_ENV=production node backend/scripts/checkAdminUser.js

# For development MongoDB
node backend/scripts/checkAdminUser.js
```

#### createAdminUser.js
**Updated**: `backend/scripts/createAdminUser.js`
- Creates or updates admin user
- Case-insensitive email handling
- Ensures correct configuration
- Resets failed login attempts
- Clears account locks

**Usage**:
```bash
# For production MongoDB
NODE_ENV=production node backend/scripts/createAdminUser.js

# For development MongoDB
node backend/scripts/createAdminUser.js
```

#### verifyAdminLogin.js
**New**: `backend/scripts/verifyAdminLogin.js`
- Comprehensive diagnostic tool
- Checks all admin user properties
- Tests password hash
- Automatically creates or fixes admin user
- Detailed logging

**Usage**:
```bash
node backend/scripts/verifyAdminLogin.js
```

## Admin Credentials

**Email**: `admin@spryclips.com`  
**Password**: `Admin@123456`  
**Role**: `admin`

## How to Verify the Fix

### Method 1: Automatic (Recommended)
Simply restart the backend server. The admin user will be automatically created or updated:

```bash
cd backend
npm start
```

Look for this message in the logs:
```
✅ Admin user exists and is properly configured
```
or
```
✅ Admin user created successfully!
```

### Method 2: Manual Script Execution
Run one of the admin user scripts:

```bash
# On production server
cd /home/reactmaster/backend
NODE_ENV=production node scripts/checkAdminUser.js
```

### Method 3: Test Login via API
```bash
curl -X POST https://spryclips.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@spryclips.com","password":"Admin@123456"}'
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@spryclips.com",
    "role": "admin",
    ...
  },
  "token": "...",
  "refreshToken": "..."
}
```

## Files Modified

1. `backend/utils/ensureAdminUser.js` - **New** - Utility to ensure admin user exists
2. `backend/index.js` - **Modified** - Added admin user initialization on startup
3. `backend/scripts/createAdminUser.js` - **Modified** - Improved with case-insensitive search and better error handling
4. `backend/scripts/checkAdminUser.js` - **Modified** - Added auto-fix capability and better diagnostics
5. `backend/scripts/verifyAdminLogin.js` - **New** - Comprehensive diagnostic tool

## Technical Details

### Email Normalization
All email lookups are now case-insensitive using regex:
```javascript
email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
```

### Password Security
- Passwords are hashed using bcrypt with 10 salt rounds
- Password history is maintained (last 5 passwords)
- Password complexity requirements enforced

### Account Lock Prevention
The fix ensures:
- `failedLoginAttempts` is reset to 0
- `lockUntil` is set to null
- No account locks prevent admin access

### Auth Provider
Ensures `authProvider` is set to `'local'` (not 'google', 'facebook', or 'oidc')

## Troubleshooting

### Issue: Script can't connect to MongoDB
**Solution**: Ensure MongoDB URI is correct in `.env.production`:
```env
MONGODB_URI=mongodb+srv://admin:tR0hD8ODPxICuafh@cluster0.q6qrciv.mongodb.net/tiktok-clone?retryWrites=true&w=majority&appName=Cluster0
```

### Issue: Admin user still can't login
**Solution**: Run the diagnostic script:
```bash
NODE_ENV=production node backend/scripts/verifyAdminLogin.js
```

### Issue: Password doesn't match
**Solution**: The scripts now automatically reset the password. If still failing, check:
1. Backend logs for detailed error messages
2. MongoDB connection status
3. Run `checkAdminUser.js` with NODE_ENV=production

## Prevention

The automatic admin user initialization on startup prevents this issue from occurring again. Even if the admin user is accidentally deleted or corrupted, it will be recreated/fixed on next server restart.

## Support

If issues persist:
1. Check backend server logs for detailed error messages
2. Verify MongoDB connection with `mongosh`
3. Run diagnostic script: `verifyAdminLogin.js`
4. Check that JWT_SECRET is configured in environment variables
