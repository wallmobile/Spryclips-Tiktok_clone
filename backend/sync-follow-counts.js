/**
 * Sync follower/following counts with actual array lengths
 * Run this once to fix any existing data inconsistencies
 */

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function syncFollowCounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone');
    console.log('✅ Connected to MongoDB');

    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to check`);

    let updated = 0;
    for (const user of users) {
      const actualFollowers = (user.followers || []).length;
      const actualFollowing = (user.followedUsers || []).length;
      const profileFollowers = user.profile?.followers || 0;
      const profileFollowing = user.profile?.following || 0;

      if (actualFollowers !== profileFollowers || actualFollowing !== profileFollowing) {
        console.log(`🔄 Updating ${user.username}:`);
        console.log(`   Followers: ${profileFollowers} → ${actualFollowers}`);
        console.log(`   Following: ${profileFollowing} → ${actualFollowing}`);

        user.profile.followers = actualFollowers;
        user.profile.following = actualFollowing;
        await user.save();
        updated++;
      }
    }

    console.log(`✅ Synced ${updated} users`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncFollowCounts();
