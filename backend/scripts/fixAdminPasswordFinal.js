const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function fixAdminPasswordFinal() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const adminEmail = 'admin@spryclips.com';
    const adminPassword = 'Admin@123456';
    
    // Find admin user
    let admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      console.log('❌ Admin user NOT FOUND! Creating new admin user...\n');
      
      // Create new admin
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      admin = new User({
        username: 'admin',
        email: adminEmail,
        password: hashedPassword, // Directly set hashed password
        role: 'admin',
        authProvider: 'local',
        emailVerified: true,
        accountStatus: 'active',
        passwordHistory: [],
        profile: {
          displayName: 'Admin'
        }
      });
      
      await admin.save();
      console.log('✅ New admin user created!\n');
    } else {
      console.log('✅ Found existing admin user\n');
      
      // Clear password history
      admin.passwordHistory = [];
      
      // Hash password directly (bypass pre-save hook complexity)
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(adminPassword, salt);
      
      // Fix all account settings
      admin.role = 'admin';
      admin.accountStatus = 'active';
      admin.emailVerified = true;
      admin.authProvider = 'local';
      admin.failedLoginAttempts = 0;
      admin.lockUntil = null;
      
      // Save without triggering password validation
      admin.markModified('password');
      await admin.save({ validateBeforeSave: false });
      
      console.log('✅ Admin password reset!\n');
    }
    
    // Verify password works
    const testMatch = await bcrypt.compare(adminPassword, admin.password);
    console.log('🔐 Password Verification Test:');
    console.log(`   Test Password: ${adminPassword}`);
    console.log(`   Match Result: ${testMatch ? '✅ CORRECT' : '❌ WRONG'}\n`);
    
    console.log('📧 FINAL ADMIN LOGIN CREDENTIALS:');
    console.log('   ════════════════════════════════');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('   ════════════════════════════════\n');
    
    console.log('✅ Admin account is ready! You can now login.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixAdminPasswordFinal();

