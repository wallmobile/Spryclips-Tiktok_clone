const mongoose = require('mongoose');
const User = require('../models/User');
const Video = require('../models/Video');
const sampleData = require('../data/sampleVideos');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';

async function addDemoVideos() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🎬 Adding demo videos...\n');

    for (let index = 0; index < sampleData.length; index++) {
      const entry = sampleData[index];
      
      // Create or find user
      let user = await User.findOne({ username: entry.user.username });
      if (!user) {
        user = new User({
          username: entry.user.username,
          email: entry.user.email,
          password: entry.user.password,
          authProvider: 'local',
          emailVerified: true,
          accountStatus: 'active',
          profile: {
            displayName: entry.user.profile.displayName || entry.user.username,
            avatar: entry.user.profile.avatar || '',
            bio: entry.user.profile.bio || '',
            followers: entry.user.profile.followers || 0,
            following: 0,
            likes: entry.user.profile.likes || 0,
            isVerified: true
          }
        });
        await user.save();
        console.log(`✅ Created user: ${entry.user.username}`);
      }

      // Check if video already exists
      const existingVideo = await Video.findOne({ url: entry.video.url });
      if (existingVideo) {
        console.log(`⏭️  Video already exists: ${entry.video.description.substring(0, 40)}...`);
        continue;
      }

      // Create video with recent date (not older than 24h)
      const createdAt = new Date(Date.now() - index * 2 * 60 * 60 * 1000); // 2 hours apart

      const video = new Video({
        user: user._id,
        url: entry.video.url,
        thumbnail: entry.video.thumbnail || '',
        description: entry.video.description || '',
        hashtags: entry.video.hashtags || [],
        category: (entry.video.category || 'general').toLowerCase(),
        likes: entry.video.likes || 0,
        comments: entry.video.comments || 0,
        shares: entry.video.shares || 0,
        views: entry.video.views || 0,
        status: 'ready',
        isPrivate: false,
        moderationStatus: 'approved',
        music: {
          name: entry.video.music?.name || '',
          artist: entry.video.music?.artist || '',
          duration: entry.video.music?.duration || ''
        },
        createdAt,
        updatedAt: createdAt
      });

      await video.save();
      console.log(`✅ Created video: ${entry.video.description.substring(0, 50)}... (${entry.video.category})`);

      // Link video to user
      if (!user.videos || !user.videos.some(id => id.equals(video._id))) {
        user.videos = user.videos || [];
        user.videos.push(video._id);
        await user.save();
      }
    }

    const totalVideos = await Video.countDocuments({ isPrivate: { $ne: true } });
    console.log(`\n✅ Done! Total public videos in database: ${totalVideos}`);
    console.log('\n📊 Videos by category:');
    const categories = await Video.aggregate([
      { $match: { isPrivate: { $ne: true } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    categories.forEach(cat => {
      console.log(`   ${cat._id || 'general'}: ${cat.count}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addDemoVideos();

