const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const ADMIN_EMAIL = 'admin@spryclips.com';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Admin@123456';

async function createAdminUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    let adminUser = await User.findOne({ 
      $or: [
        { email: ADMIN_EMAIL },
        { username: ADMIN_USERNAME },
        { role: 'admin' }
      ]
    });

    if (adminUser) {
      console.log('⚠️  Admin user already exists!');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Username: ${adminUser.username}`);
      
      // Update to ensure it's admin
      adminUser.role = 'admin';
      adminUser.accountStatus = 'active';
      adminUser.emailVerified = true;
      adminUser.password = ADMIN_PASSWORD;
      await adminUser.save();
      
      console.log('\n✅ Updated existing user to admin');
      console.log(`\n📧 ADMIN LOGIN CREDENTIALS:`);
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Username: ${ADMIN_USERNAME}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      
      await mongoose.disconnect();
      return;
    }

    // Create new admin user
    adminUser = new User({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      authProvider: 'local',
      emailVerified: true,
      accountStatus: 'active',
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
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;