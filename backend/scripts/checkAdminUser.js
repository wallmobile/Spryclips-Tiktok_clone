const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');

// Load environment variables - try production first, then development
const envPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../../.env.production')
  : path.join(__dirname, '../../.env');

require('dotenv').config({ path: envPath });

async function checkAdminUser() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const adminEmail = 'admin@spryclips.com';
    const normalizedEmail = adminEmail.toLowerCase().trim();
    
    // Try case-insensitive search
    const admin = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    
    if (!admin) {
      console.log('❌ Admin user NOT FOUND!');
      console.log('Creating admin user now...\n');
      
      const newAdmin = new User({
        username: 'admin',
        email: normalizedEmail,
        password: 'Admin@123456',
        role: 'admin',
        authProvider: 'local',
        emailVerified: true,
        accountStatus: 'active',
        failedLoginAttempts: 0,
        profile: {
          displayName: 'Admin'
        }
      });
      
      await newAdmin.save();
      console.log('✅ Admin user created!\n');
      console.log('📧 Email: admin@spryclips.com');
      console.log('🔑 Password: ******** (check ADMIN_LOGIN_FIX.md)\n');
    } else {
      console.log('✅ Admin user EXISTS:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Auth Provider: ${admin.authProvider}`);
      console.log(`   Status: ${admin.accountStatus}`);
      console.log(`   Email Verified: ${admin.emailVerified}`);
      console.log(`   Failed Login Attempts: ${admin.failedLoginAttempts || 0}`);
      console.log(`   Is Locked: ${admin.lockUntil ? (admin.lockUntil > new Date() ? 'YES' : 'NO') : 'NO'}`);
      console.log(`   Has Password: ${!!admin.password}`);
      
      // Test password
      if (admin.password) {
        const bcrypt = require('bcryptjs');
        const testPassword = 'Admin@123456';
        const isMatch = await bcrypt.compare(testPassword, admin.password);
        console.log(`\n🔐 Password Test: ${isMatch ? '✅ CORRECT' : '❌ WRONG'}`);
        
        if (!isMatch) {
          console.log('\n⚠️  Password does NOT match! Fixing...');
          admin.password = testPassword;
          admin.failedLoginAttempts = 0;
          admin.lockUntil = null;
          admin.role = 'admin';
          admin.authProvider = 'local';
          admin.accountStatus = 'active';
          admin.emailVerified = true;
          await admin.save();
          console.log('✅ Admin password reset successfully!');
        }
      } else {
        console.log('\n⚠️  Admin has NO password! Fixing...');
        admin.password = 'Admin@123456';
        admin.failedLoginAttempts = 0;
        admin.lockUntil = null;
        admin.role = 'admin';
        admin.authProvider = 'local';
        admin.accountStatus = 'active';
        admin.emailVerified = true;
        await admin.save();
        console.log('✅ Admin password set successfully!');
      }
      
      console.log(`\n📧 ADMIN ACCOUNT:`);
      console.log(`   Email: admin@spryclips.com`);
      console.log(`   Password: ******** (check ADMIN_LOGIN_FIX.md)`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

checkAdminUser();

