const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function fixAdminPasswordDirect() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const adminEmail = 'admin@spryclips.com';
    const adminPassword = 'Admin@123456';
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    console.log('🔧 Updating admin account directly in database...\n');
    
    // Update directly using MongoDB update (bypasses Mongoose hooks)
    const result = await User.updateOne(
      { email: adminEmail },
      {
        $set: {
          password: hashedPassword,
          role: 'admin',
          accountStatus: 'active',
          emailVerified: true,
          authProvider: 'local',
          failedLoginAttempts: 0,
          lockUntil: null
        },
        $unset: {
          passwordHistory: ''
        }
      }
    );
    
    if (result.matchedCount === 0) {
      console.log('❌ Admin user NOT FOUND! Creating new admin user...\n');
      
      // Create new admin
      const newAdmin = new User({
        username: 'admin',
        email: adminEmail,
        password: adminPassword, // Will be hashed by pre-save hook
        role: 'admin',
        authProvider: 'local',
        emailVerified: true,
        accountStatus: 'active',
        passwordHistory: [],
        profile: {
          displayName: 'Admin'
        }
      });
      
      await newAdmin.save();
      console.log('✅ New admin user created!\n');
    } else {
      console.log('✅ Admin account updated!\n');
    }
    
    // Verify
    const admin = await User.findOne({ email: adminEmail }).select('+password');
    const testMatch = await bcrypt.compare(adminPassword, admin.password);
    
    console.log('🔐 Password Verification:');
    console.log(`   Match Result: ${testMatch ? '✅ CORRECT' : '❌ WRONG'}\n`);
    
    console.log('📧 ADMIN LOGIN CREDENTIALS:');
    console.log('   ════════════════════════════════');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('   ════════════════════════════════\n');
    
    console.log('✅ Admin account is ready! Please try login now.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixAdminPasswordDirect();

