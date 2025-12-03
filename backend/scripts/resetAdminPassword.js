const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function resetAdminPassword() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const adminEmail = 'admin@spryclips.com';
    const newPassword = 'Admin@123456';
    
    // Find admin user
    const admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      console.log('❌ Admin user NOT FOUND!');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('✅ Found admin user');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}\n`);

    // Clear password history to avoid conflicts
    admin.passwordHistory = [];
    
    // Set new password (will be hashed by pre-save hook)
    admin.password = newPassword;
    
    // Ensure these fields are set
    admin.emailVerified = true;
    admin.accountStatus = 'active';
    admin.failedLoginAttempts = 0;
    admin.lockUntil = null;
    
    await admin.save();
    
    console.log('✅ Admin password reset successfully!');
    console.log(`\n📧 LOGIN CREDENTIALS:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`\n🔐 You can now login with these credentials!`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

resetAdminPassword();

