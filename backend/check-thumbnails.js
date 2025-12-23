// Quick script to check video thumbnails in database
require('dotenv').config();
const mongoose = require('mongoose');
const Video = require('./models/Video');

async function checkThumbnails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tiktok-clone');
    console.log('✅ Connected to MongoDB\n');
    
    // Get 5 videos with their thumbnails
    const videos = await Video.find()
      .select('thumbnail url description')
      .limit(5)
      .lean();
    
    console.log('=== Video Thumbnails (First 5) ===\n');
    
    videos.forEach((video, index) => {
      console.log(`${index + 1}. ${video.description?.substring(0, 40) || 'No description'}`);
      console.log(`   Thumbnail: ${video.thumbnail || 'NO THUMBNAIL'}`);
      console.log(`   URL: ${video.url || 'NO URL'}`);
      console.log('');
    });
    
    // Count videos without thumbnails
    const noThumbnail = await Video.countDocuments({ 
      $or: [
        { thumbnail: { $exists: false } },
        { thumbnail: null },
        { thumbnail: '' }
      ]
    });
    
    const total = await Video.countDocuments();
    
    console.log(`\nTotal Videos: ${total}`);
    console.log(`Videos without thumbnail: ${noThumbnail}`);
    console.log(`Videos with thumbnail: ${total - noThumbnail}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkThumbnails();
