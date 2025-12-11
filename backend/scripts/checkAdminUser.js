const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function checkAdminUser() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const adminEmail = 'admin@spryclips.com';
    const admin = await User.findOne({ email: adminEmail }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin user NOT FOUND!');
      console.log('Creating admin user now...\n');
      
      const newAdmin = new User({
        username: 'admin',
        email: adminEmail,
        password: 'Admin@123456',
        role: 'admin',
        authProvider: 'local',
        emailVerified: true,
        accountStatus: 'active',
        profile: {
          displayName: 'Admin'
        }
      });
      
      await newAdmin.save();
      console.log('✅ Admin user created!\n');
      console.log('📧 Email: admin@spryclips.com');
      console.log('🔑 Password: Admin@123456\n');
    } else {
      console.log('✅ Admin user EXISTS:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Status: ${admin.accountStatus}`);
      console.log(`   Email Verified: ${admin.emailVerified}`);
      console.log(`\n📧 LOGIN CREDENTIALS:`);
      console.log(`   Email: admin@spryclips.com`);
      console.log(`   Password: Admin@123456`);
      
      // Test password
      if (admin.password) {
        const bcrypt = require('bcryptjs');
        const testPassword = 'Admin@123456';
        const isMatch = await bcrypt.compare(testPassword, admin.password);
        console.log(`\n🔐 Password Test: ${isMatch ? '✅ CORRECT' : '❌ WRONG'}`);
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAdminUser();

