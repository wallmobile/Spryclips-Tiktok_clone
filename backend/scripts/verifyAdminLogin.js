const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load production environment
require('dotenv').config({ path: path.join(__dirname, '../../.env.production') });

const ADMIN_EMAIL = 'admin@spryclips.com';
const ADMIN_USERNAME = 'admin';
const TEST_PASSWORD = 'Admin@123456';

async function verifyAdminLogin() {
  try {
    // Use MongoDB URI from .env.production
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in .env.production');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB Atlas...');
    console.log(`   URI: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas\n');

    // Find admin user
    const admin = await User.findOne({ 
      email: ADMIN_EMAIL.toLowerCase().trim() 
    });
    
    if (!admin) {
      console.log('❌ Admin user NOT FOUND in database!');
      console.log(`   Searched for email: ${ADMIN_EMAIL}`);
      console.log('\n🔧 Creating admin user...\n');
      
      // Create admin user
      const newAdmin = new User({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL.toLowerCase(),
        password: TEST_PASSWORD,
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
      console.log('✅ Admin user created successfully!\n');
      console.log('📧 LOGIN CREDENTIALS:');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: ${TEST_PASSWORD}`);
      console.log(`   Role: admin\n`);
      
      await mongoose.disconnect();
      process.exit(0);
    }

    // Admin user exists - verify details
    console.log('✅ Admin user EXISTS in database:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Auth Provider: ${admin.authProvider}`);
    console.log(`   Status: ${admin.accountStatus}`);
    console.log(`   Email Verified: ${admin.emailVerified}`);
    console.log(`   Failed Login Attempts: ${admin.failedLoginAttempts || 0}`);
    console.log(`   Is Locked: ${admin.isLocked ? admin.isLocked() : false}`);
    console.log(`   Has Password: ${!!admin.password}`);

    // Test password
    if (admin.password) {
      console.log('\n🔐 Testing password...');
      const isMatch = await bcrypt.compare(TEST_PASSWORD, admin.password);
      console.log(`   Password "${TEST_PASSWORD}": ${isMatch ? '✅ CORRECT' : '❌ WRONG'}`);
      
      if (!isMatch) {
        console.log('\n⚠️  Password does NOT match!');
        console.log('🔧 Resetting admin password...\n');
        
        // Reset password
        admin.password = TEST_PASSWORD;
        admin.failedLoginAttempts = 0;
        admin.lockUntil = null;
        admin.accountStatus = 'active';
        admin.emailVerified = true;
        admin.role = 'admin';
        admin.authProvider = 'local';
        
        await admin.save();
        
        console.log('✅ Admin password reset successfully!');
        console.log('\n📧 NEW LOGIN CREDENTIALS:');
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${TEST_PASSWORD}`);
        console.log(`   Role: admin\n`);
      } else {
        console.log('\n✅ Admin login should work with these credentials:');
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${TEST_PASSWORD}\n`);
      }
    } else {
      console.log('\n❌ Admin user has NO password!');
      console.log('🔧 Setting admin password...\n');
      
      // Set password
      admin.password = TEST_PASSWORD;
      admin.failedLoginAttempts = 0;
      admin.lockUntil = null;
      admin.accountStatus = 'active';
      admin.emailVerified = true;
      admin.role = 'admin';
      admin.authProvider = 'local';
      
      await admin.save();
      
      console.log('✅ Admin password set successfully!');
      console.log('\n📧 LOGIN CREDENTIALS:');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: ${TEST_PASSWORD}\n`);
    }

    await mongoose.disconnect();
    console.log('✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

verifyAdminLogin();
