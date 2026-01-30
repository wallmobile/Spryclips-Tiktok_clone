const mongoose = require('mongoose');
const Video = require('./models/Video');

async function checkVideos() {
  try {
    await mongoose.connect('mongodb://localhost:27017/tiktok-clone');
    console.log('✅ Connected\n');
    
    const total = await Video.countDocuments({isPrivate: {$ne: true}});
    console.log(`📊 Total public videos: ${total}\n`);
    
    if (total === 0) {
      console.log('❌ No videos in database!');
      console.log('💡 Run: node backend/scripts/addDemoVideos.js\n');
      process.exit(0);
    }
    
    const categories = await Video.aggregate([
      {$match: {isPrivate: {$ne: true}}},
      {$group: {_id: '$category', count: {$sum: 1}}},
      {$sort: {count: -1}}
    ]);
    
    console.log('📹 Videos by category:');
    categories.forEach(c => {
      console.log(`   ${c._id || '(no category)'}: ${c.count}`);
    });
    
    console.log('\n🔍 Testing filters:');
    const filters = ['dance', 'food', 'music', 'sports', 'fashion', 'comedy'];
    for (const filter of filters) {
      const count = await Video.countDocuments({
        isPrivate: {$ne: true},
        $or: [
          {category: filter},
          {category: new RegExp(filter, 'i')},
          {hashtags: {$in: [filter]}}
        ]
      });
      console.log(`   ${filter}: ${count} videos`);
    }
    
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

checkVideos();

