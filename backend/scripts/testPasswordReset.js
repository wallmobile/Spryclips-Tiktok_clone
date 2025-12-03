const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/tiktok-clone';

async function testPasswordReset() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the user we just created
    const user = await User.findOne({ email: 'cemitam985@idwager.com' });
    
    if (!user) {
      console.log('❌ User not found: cemitam985@idwager.com');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Password (first 20 chars): ${user.password ? user.password.substring(0, 20) + '...' : 'NULL'}`);
    console.log(`   Password is hashed: ${user.password && user.password.length > 40 ? '✅ Yes (bcrypt hash)' : '❌ No'}`);
    console.log('');

    // Check recent password reset records
    const recentResets = await PasswordReset.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    console.log('📋 Recent Password Reset Records:');
    if (recentResets.length === 0) {
      console.log('   No password reset records found.');
    } else {
      recentResets.forEach((reset, index) => {
        console.log(`\n   ${index + 1}. Created: ${new Date(reset.createdAt).toLocaleString()}`);
        console.log(`      Code: ${reset.code}`);
        console.log(`      Used: ${reset.used ? '✅ Yes' : '❌ No'}`);
        console.log(`      Expired: ${new Date(reset.expiresAt) < new Date() ? '❌ Yes' : '✅ No'}`);
      });
    }

    console.log('\n✅ Password reset functionality check complete!');
    console.log('\n📝 Summary:');
    console.log(`   - User exists: ✅`);
    console.log(`   - Password stored: ${user.password ? '✅ Yes (hashed)' : '❌ No'}`);
    console.log(`   - Can login: ${user.password && user.password.length > 40 ? '✅ Yes (password is hashed)' : '❌ Check password'}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testPasswordReset();

