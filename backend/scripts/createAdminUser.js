const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');

// Load environment variables - try production first, then development
const envPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../../.env.production')
  : path.join(__dirname, '../../.env');

require('dotenv').config({ path: envPath });

const ADMIN_EMAIL = 'admin@spryclips.com';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Admin@123456';

async function createAdminUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Normalize email for consistent lookup
    const normalizedEmail = ADMIN_EMAIL.toLowerCase().trim();

    // Check if admin user already exists with case-insensitive email search
    let adminUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (adminUser) {
      console.log('⚠️  Admin user already exists!');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Username: ${adminUser.username}`);
      console.log(`   Current Role: ${adminUser.role}`);
      console.log(`   Auth Provider: ${adminUser.authProvider}`);
      console.log(`   Account Status: ${adminUser.accountStatus}`);
      
      // Update to ensure it's properly configured
      adminUser.role = 'admin';
      adminUser.accountStatus = 'active';
      adminUser.emailVerified = true;
      adminUser.authProvider = 'local';
      adminUser.password = ADMIN_PASSWORD;
      adminUser.failedLoginAttempts = 0;
      adminUser.lockUntil = null;
      
      await adminUser.save();
      
      console.log('\n✅ Updated existing user to admin with correct configuration');
      console.log(`\n📧 ADMIN LOGIN CREDENTIALS:`);
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Username: ${ADMIN_USERNAME}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      
      await mongoose.disconnect();
      return adminUser;
    }

    // Create new admin user
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
    
    console.log('\n✅ Admin user created successfully!');
    console.log(`\n📧 ADMIN LOGIN CREDENTIALS:`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Username: ${ADMIN_USERNAME}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);

    await mongoose.disconnect();
    return adminUser;
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    throw error;
  }
}

if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;