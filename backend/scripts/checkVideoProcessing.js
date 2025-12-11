const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function checkVideoProcessing() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const VideoProcessing = require('../models/VideoProcessing');
    const Video = require('../models/Video');
    const User = require('../models/User');

    const count = await VideoProcessing.countDocuments();
    console.log(`📊 Total video processing records: ${count}\n`);

    if (count === 0) {
      console.log('⚠️  No video processing records found!');
      console.log('Creating sample records...\n');
      
      const admin = await User.findOne({ role: 'admin' });
      const videos = await Video.find().limit(5);
      
      if (admin && videos.length > 0) {
        const statuses = ['pending', 'processing', 'completed', 'failed'];
        const stages = ['upload', 'validation', 'transcode', 'thumbnail', 'complete'];
        
        for (let i = 0; i < Math.min(5, videos.length); i++) {
          const status = statuses[i % statuses.length];
          const progress = status === 'pending' ? 0 : status === 'processing' ? 45 : status === 'completed' ? 100 : 0;
          
          await VideoProcessing.create({
            videoId: videos[i]._id,
            userId: admin._id,
            status: status,
            uploadProgress: progress,
            processingStage: stages[i % stages.length],
            fileSize: (10 + Math.random() * 20) * 1024 * 1024, // 10-30 MB
            startedAt: new Date(Date.now() - i * 60 * 60 * 1000)
          });
          console.log(`✅ Created record ${i + 1}: ${status} - ${stages[i % stages.length]}`);
        }
        console.log('\n✅ Sample records created!\n');
      } else {
        console.log('⚠️  No admin user or videos found to create sample data\n');
      }
    }

    const records = await VideoProcessing.find()
      .populate('videoId', 'title')
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`📋 Recent Records (${records.length}):\n`);
    records.forEach((r, i) => {
      console.log(`${i + 1}. Video: ${r.videoId?.title || 'N/A'}`);
      console.log(`   User: ${r.userId?.username || 'N/A'}, Status: ${r.status}`);
      console.log(`   Progress: ${r.uploadProgress}%, Stage: ${r.processingStage}`);
      console.log(`   File Size: ${(r.fileSize / (1024 * 1024)).toFixed(2)} MB\n`);
    });

    // Get stats
    const stats = await VideoProcessing.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('📊 Status Distribution:');
    stats.forEach(s => {
      console.log(`   ${s._id}: ${s.count}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkVideoProcessing();

