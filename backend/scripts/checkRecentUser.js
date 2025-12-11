const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';

async function checkRecentUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find users created in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentUsers = await User.find({
      createdAt: { $gte: fiveMinutesAgo }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('username email createdAt emailVerified')
    .lean();

    if (recentUsers.length === 0) {
      console.log('❌ No users found in the last 5 minutes.');
      console.log('\n📋 Checking last 10 users created...\n');
      
      const lastUsers = await User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('username email createdAt emailVerified')
        .lean();

      if (lastUsers.length > 0) {
        console.log('📋 Last 10 users:\n');
        lastUsers.forEach((user, index) => {
          const timeAgo = Math.round((Date.now() - new Date(user.createdAt)) / 1000 / 60);
          console.log(`${index + 1}. Username: ${user.username}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Created: ${timeAgo} minutes ago`);
          console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
          console.log('');
        });
      } else {
        console.log('❌ No users found in database.');
      }
    } else {
      console.log(`✅ Found ${recentUsers.length} user(s) created in last 5 minutes:\n`);
      
      recentUsers.forEach((user, index) => {
        const timeAgo = Math.round((Date.now() - new Date(user.createdAt)) / 1000 / 60);
        console.log(`${index + 1}. Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created: ${timeAgo} minutes ago`);
        console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
        console.log(`   Created At: ${new Date(user.createdAt).toLocaleString()}`);
        console.log('');
      });

      // Get the most recent user
      const mostRecent = recentUsers[0];
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔑 MOST RECENT USER LOGIN CREDENTIALS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Email: ${mostRecent.email}`);
      console.log(`Username: ${mostRecent.username}`);
      console.log(`Password: [Hashed - cannot show original]`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('⚠️  Note: Passwords are hashed in database.');
      console.log('   If you need the password, check the signup form submission or backend logs.\n');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRecentUser();


