const User = require('../models/User');

const ADMIN_EMAIL = 'admin@spryclips.com';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Admin@123456';

/**
 * Ensures that an admin user exists in the database
 * Creates or updates the admin user with correct credentials
 * This runs automatically on backend startup
 */
async function ensureAdminUser() {
  try {
    const normalizedEmail = ADMIN_EMAIL.toLowerCase().trim();
    
    // Check if admin user exists (case-insensitive email search)
    let adminUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (adminUser) {
      // Admin user exists - ensure it has correct configuration
      let needsUpdate = false;
      
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        needsUpdate = true;
      }
      
      if (adminUser.authProvider !== 'local') {
        adminUser.authProvider = 'local';
        needsUpdate = true;
      }
      
      if (adminUser.accountStatus !== 'active') {
        adminUser.accountStatus = 'active';
        needsUpdate = true;
      }
      
      if (!adminUser.emailVerified) {
        adminUser.emailVerified = true;
        needsUpdate = true;
      }
      
      if (adminUser.failedLoginAttempts > 0) {
        adminUser.failedLoginAttempts = 0;
        needsUpdate = true;
      }
      
      if (adminUser.lockUntil) {
        adminUser.lockUntil = null;
        needsUpdate = true;
      }
      
      // Always reset password to ensure it's correct
      // This is safe because we're only doing this for the specific admin account
      adminUser.password = ADMIN_PASSWORD;
      needsUpdate = true;
      
      if (needsUpdate) {
        await adminUser.save();
        console.log('✅ Admin user configuration updated');
      } else {
        console.log('✅ Admin user exists and is properly configured');
      }
      
      return adminUser;
    }

    // Admin user doesn't exist - create it
    console.log('⚠️  Admin user not found. Creating...');
    
    adminUser = new User({
      username: ADMIN_USERNAME,
      email: normalizedEmail,
      password: ADMIN_PASSWORD,
      role: 'admin',
      authProvider: 'local',
      emailVerified: true,
      accountStatus: 'active',
      failedLoginAttempts: 0,
      profile: {
        displayName: 'Admin',
        bio: 'Administrator Account'
      }
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log('🔑 Password has been set (check ADMIN_LOGIN_FIX.md for credentials)');
    
    return adminUser;
  } catch (error) {
    // Log error but don't crash the server
    console.error('❌ Error ensuring admin user exists:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack:', error.stack);
    }
    // Don't throw - we don't want to prevent server startup if this fails
    return null;
  }
}

module.exports = ensureAdminUser;
