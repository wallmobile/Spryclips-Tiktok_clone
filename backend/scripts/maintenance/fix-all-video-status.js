const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tiktok_clone', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define Video schema (minimal version)
const videoSchema = new mongoose.Schema({}, { strict: false });
const Video = mongoose.model('Video', videoSchema);

async function fixAllVideoStatus() {
  try {
    console.log('\n🔧 Fixing video statuses...\n');
    
    // Find all videos that are not ready
    const nonReadyVideos = await Video.find({ 
      status: { $ne: 'ready' } 
    });
    
    console.log(`Found ${nonReadyVideos.length} videos with non-ready status:\n`);
    
    nonReadyVideos.forEach(video => {
      console.log(`  - ${video._id}: "${video.description || 'No description'}" (status: ${video.status || 'undefined'})`);
    });
    
    if (nonReadyVideos.length > 0) {
      // Update all non-ready videos to ready
      const result = await Video.updateMany(
        { status: { $ne: 'ready' } },
        { $set: { status: 'ready' } }
      );
      
      console.log(`\n✅ Updated ${result.modifiedCount} videos to 'ready' status\n`);
    } else {
      console.log('\n✅ All videos already have ready status\n');
    }
    
    // Also update videos with no status field
    const noStatusVideos = await Video.find({ 
      status: { $exists: false } 
    });
    
    if (noStatusVideos.length > 0) {
      console.log(`\nFound ${noStatusVideos.length} videos without status field:`);
      noStatusVideos.forEach(video => {
        console.log(`  - ${video._id}: "${video.description || 'No description'}"`);
      });
      
      const result2 = await Video.updateMany(
        { status: { $exists: false } },
        { $set: { status: 'ready' } }
      );
      
      console.log(`✅ Added 'ready' status to ${result2.modifiedCount} videos\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
  }
}

fixAllVideoStatus();
