const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('./models/User');

// Connect to MongoDB
async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/tiktok-clone';
    console.log('🔌 Connecting to MongoDB...');
    console.log('📍 Connection string:', mongoUri.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
    console.log('📦 Database:', mongoose.connection.name);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function checkFollowData() {
  await connectDB();
  
  try {
    console.log('\n📊 Checking Follow Data in Database...\n');
    
    // Get all users
    const users = await User.find({}).select('username followers followedUsers profile.followers profile.following');
    
    console.log(`Found ${users.length} users\n`);
    
    let totalFollowers = 0;
    let totalFollowing = 0;
    let usersWithFollowers = 0;
    let usersWithFollowing = 0;
    let mismatchedCounts = 0;
    
    users.forEach(user => {
      const followersArrayLength = user.followers?.length || 0;
      const followingArrayLength = user.followedUsers?.length || 0;
      const followersCount = user.profile?.followers || 0;
      const followingCount = user.profile?.following || 0;
      
      totalFollowers += followersArrayLength;
      totalFollowing += followingArrayLength;
      
      if (followersArrayLength > 0) usersWithFollowers++;
      if (followingArrayLength > 0) usersWithFollowing++;
      
      const followersMismatch = followersArrayLength !== followersCount;
      const followingMismatch = followingArrayLength !== followingCount;
      
      if (followersMismatch || followingMismatch) {
        mismatchedCounts++;
        console.log(`⚠️  User: ${user.username} (${user._id})`);
        console.log(`   Followers: Array[${followersArrayLength}] vs Count[${followersCount}] ${followersMismatch ? '❌ MISMATCH' : '✅'}`);
        console.log(`   Following: Array[${followingArrayLength}] vs Count[${followingCount}] ${followingMismatch ? '❌ MISMATCH' : '✅'}`);
        
        if (followersArrayLength > 0) {
          console.log(`   Followers IDs:`, user.followers.map(id => id.toString()));
        }
        if (followingArrayLength > 0) {
          console.log(`   Following IDs:`, user.followedUsers.map(id => id.toString()));
        }
        console.log('');
      } else if (followersArrayLength > 0 || followingArrayLength > 0) {
        console.log(`✅ User: ${user.username} (${user._id})`);
        console.log(`   Followers: ${followersArrayLength} | Following: ${followingArrayLength}`);
        if (followersArrayLength > 0) {
          console.log(`   Followers IDs:`, user.followers.map(id => id.toString()));
        }
        if (followingArrayLength > 0) {
          console.log(`   Following IDs:`, user.followedUsers.map(id => id.toString()));
        }
        console.log('');
      }
    });
    
    console.log('\n📈 Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Users with followers: ${usersWithFollowers}`);
    console.log(`   Users with following: ${usersWithFollowing}`);
    console.log(`   Total follower relationships: ${totalFollowers}`);
    console.log(`   Total following relationships: ${totalFollowing}`);
    console.log(`   Users with count mismatches: ${mismatchedCounts}`);
    
    if (mismatchedCounts > 0) {
      console.log('\n⚠️  Run sync-follow-counts.js to fix mismatches');
    } else {
      console.log('\n✅ All counts are synchronized!');
    }
    
    if (totalFollowers === 0 && totalFollowing === 0) {
      console.log('\n⚠️  WARNING: No follow relationships found in database!');
      console.log('   Please try following a user to test the feature.');
    }
    
  } catch (error) {
    console.error('❌ Error checking follow data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

checkFollowData();
