# Security Notice

## Important Security Updates

This repository has been updated with improved security practices for admin user management and environment configuration.

### Admin User Credentials

**Default Credentials** (for development/testing):
- Email: `admin@spryclips.com`
- Password: `Admin@123456`

**Production Recommendation**:
For production environments, it is **strongly recommended** to override the default admin credentials using environment variables:

```env
ADMIN_EMAIL=your-admin@yourdomain.com
ADMIN_USERNAME=youradmin
ADMIN_PASSWORD=YourVerySecurePassword123!@#
```

### Environment Variables Security

1. **`.env.production` should NOT be committed to version control**
   - The `.env.production` file has been added to `.gitignore`
   - Use `.env.production.example` as a template
   - Copy `.env.production.example` to `.env.production` and fill in actual values

2. **Sensitive Credentials**
   - Never commit MongoDB credentials
   - Never commit JWT secrets
   - Never commit API keys or passwords
   - Use environment variables for all sensitive data

3. **Best Practices**
   - Use strong, unique passwords for admin accounts
   - Rotate credentials regularly
   - Use different credentials for development, staging, and production
   - Enable 2FA for admin accounts when available

### Password Security

- Admin passwords are hashed using bcrypt with 10 salt rounds
- Password history is maintained (last 5 passwords)
- Password complexity requirements are enforced:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

### Automatic Admin User Management

The backend now automatically ensures an admin user exists on startup:
- Creates admin user if missing
- Updates configuration if incorrect
- Only resets password if it doesn't match the expected value
- Prevents accidental lockouts
- Can be customized via environment variables

### What Changed

1. **Password Logging Removed**: Passwords are no longer logged in plain text
2. **Environment Variable Support**: Admin credentials can be set via environment
3. **Conditional Password Reset**: Only resets password if verification fails
4. **Documentation Updated**: All docs use placeholder credentials
5. **`.gitignore` Updated**: Production env files are now ignored

### Migration Steps for Existing Deployments

If you have an existing deployment with the old setup:

1. **Backup your current `.env.production`**:
   ```bash
   cp .env.production .env.production.backup
   ```

2. **Add custom admin credentials** (optional but recommended):
   ```bash
   echo "ADMIN_EMAIL=your-custom-admin@email.com" >> .env.production
   echo "ADMIN_USERNAME=youradmin" >> .env.production
   echo "ADMIN_PASSWORD=YourSecurePassword123!" >> .env.production
   ```

3. **Restart the backend**:
   ```bash
   pm2 restart backend
   ```

4. **Verify admin login** with your new credentials

### Security Checklist

- [ ] Custom admin credentials set in environment variables
- [ ] `.env.production` NOT committed to repository
- [ ] Strong, unique passwords used
- [ ] MongoDB credentials use strong authentication
- [ ] JWT_SECRET is a long, random string
- [ ] Regular security audits scheduled
- [ ] Dependencies kept up to date
- [ ] HTTPS enabled in production
- [ ] Rate limiting configured

### Reporting Security Issues

If you discover a security vulnerability, please:
1. Do NOT open a public issue
2. Email security concerns to: [your-security-email]
3. Include detailed steps to reproduce
4. Wait for acknowledgment before public disclosure

### Additional Resources

- [ADMIN_LOGIN_FIX.md](./ADMIN_LOGIN_FIX.md) - Admin login setup guide
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment instructions
- [.env.production.example](./.env.production.example) - Environment template

---

**Last Updated**: December 2024  
**Version**: 1.0
