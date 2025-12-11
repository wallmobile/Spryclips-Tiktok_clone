const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function fixAdminLogin() {
  try {
    // Use the same database name as the main app
    // Check .env first, then use default that matches backend
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';
    // If .env has tiktok_clone, use that instead
    const finalUri = process.env.MONGODB_URI || (process.env.NODE_ENV === 'production' ? 'mongodb://localhost:27017/tiktok-clone' : 'mongodb://localhost:27017/tiktok-clone');
    console.log('🔌 Connecting to MongoDB:', mongoUri.replace(/\/\/.*@/, '//***@')); // Hide credentials
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const adminEmail = 'admin@spryclips.com';
    const adminPassword = 'Admin@123456';
    
    // Find admin user
    let admin = await User.findOne({ email: adminEmail }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin user NOT FOUND! Creating new admin user...\n');
      
      // Create new admin with plain password (will be hashed by pre-save hook)
      admin = new User({
        username: 'admin',
        email: adminEmail,
        password: adminPassword, // Will be hashed by pre-save hook
        role: 'admin',
        authProvider: 'local',
        emailVerified: true,
        accountStatus: 'active',
        profile: {
          displayName: 'Admin',
          bio: 'Administrator Account'
        }
      });
      
      await admin.save();
      console.log('✅ New admin user created!\n');
    } else {
      console.log('✅ Found existing admin user');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Role: ${admin.role || 'NOT SET'}`);
      console.log(`   Status: ${admin.accountStatus || 'NOT SET'}\n`);
      
      // Clear password history FIRST to avoid password reuse check
      admin.passwordHistory = [];
      await admin.save();
      
      // Now reset password and fix all settings
      admin.password = adminPassword; // Will be hashed by pre-save hook
      admin.role = 'admin';
      admin.accountStatus = 'active';
      admin.emailVerified = true;
      admin.authProvider = 'local';
      admin.failedLoginAttempts = 0;
      admin.lockUntil = null;
      
      await admin.save();
      console.log('✅ Admin account updated and password reset!\n');
    }
    
    // Verify password works
    const adminWithPassword = await User.findOne({ email: adminEmail }).select('+password');
    if (adminWithPassword && adminWithPassword.password) {
      const testMatch = await bcrypt.compare(adminPassword, adminWithPassword.password);
      console.log('🔐 Password Verification Test:');
      console.log(`   Match Result: ${testMatch ? '✅ CORRECT' : '❌ WRONG'}\n`);
      
      if (!testMatch) {
        console.log('⚠️  Password verification failed. Trying direct hash...\n');
        // Try direct hash
        const salt = await bcrypt.genSalt(10);
        adminWithPassword.password = await bcrypt.hash(adminPassword, salt);
        await adminWithPassword.save({ validateBeforeSave: false });
        
        const retestMatch = await bcrypt.compare(adminPassword, adminWithPassword.password);
        console.log(`   Retest Result: ${retestMatch ? '✅ CORRECT' : '❌ WRONG'}\n`);
      }
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 ADMIN LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('✅ Admin account is ready! You can now login at:');
    console.log('   http://localhost:3000/admin/login\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  fixAdminLogin();
}

module.exports = fixAdminLogin;
