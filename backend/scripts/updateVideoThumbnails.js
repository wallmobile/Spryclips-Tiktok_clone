const mongoose = require('mongoose');
const Video = require('../models/Video');
const sampleData = require('../data/sampleVideos');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';

async function updateVideoThumbnails() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🖼️  Updating video thumbnails...\n');

    for (const entry of sampleData) {
      // Find video by URL
      const video = await Video.findOne({ url: entry.video.url });
      
      if (video) {
        // Update thumbnail if it's missing or different
        if (!video.thumbnail || video.thumbnail !== entry.video.thumbnail) {
          video.thumbnail = entry.video.thumbnail;
          await video.save();
          console.log(`✅ Updated thumbnail for: ${video.description.substring(0, 50)}...`);
          console.log(`   Thumbnail: ${entry.video.thumbnail.substring(0, 60)}...`);
        } else {
          console.log(`⏭️  Thumbnail already up-to-date: ${video.description.substring(0, 50)}...`);
        }
      } else {
        console.log(`⚠️  Video not found: ${entry.video.url}`);
      }
    }

    console.log('\n✅ Done! All video thumbnails updated.');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateVideoThumbnails();
