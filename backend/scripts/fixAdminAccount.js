const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function fixAdminAccount() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const adminEmail = 'admin@spryclips.com';
    const admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      console.log('❌ Admin user NOT FOUND!');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('🔍 Current Admin Account Status:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Status: ${admin.accountStatus}`);
    console.log(`   Email Verified: ${admin.emailVerified}`);
    console.log(`   Auth Provider: ${admin.authProvider}`);
    console.log(`   Failed Login Attempts: ${admin.failedLoginAttempts || 0}`);
    console.log(`   Lock Until: ${admin.lockUntil || 'Not locked'}`);
    console.log(`   Has Password: ${!!admin.password}\n`);

    // Fix all potential issues
    admin.role = 'admin';
    admin.accountStatus = 'active';
    admin.emailVerified = true;
    admin.authProvider = 'local';
    admin.failedLoginAttempts = 0;
    admin.lockUntil = null;
    
    // Clear password history FIRST before setting new password
    admin.passwordHistory = [];
    await admin.save(); // Save to clear history
    
    // Now set the new password (will be hashed by pre-save hook)
    admin.password = 'Admin@123456';
    admin.isNew = false; // Important: mark as existing user
    await admin.save();
    
    console.log('✅ Admin account fixed!');
    console.log(`\n📧 LOGIN CREDENTIALS:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: Admin@123456`);
    console.log(`\n✨ All account locks cleared!`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixAdminAccount();
