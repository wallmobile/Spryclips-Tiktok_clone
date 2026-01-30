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

async function findSpecificVideos() {
  try {
    const descriptions = ['cfeerer', 'bnbjgnbjnb', 'testing testing'];
    
    console.log('\n🔍 Searching for videos with specific descriptions...\n');
    
    for (const desc of descriptions) {
      const videos = await Video.find({ 
        description: new RegExp(desc, 'i') 
      });
      
      console.log(`"${desc}": ${videos.length} videos found`);
      if (videos.length > 0) {
        videos.forEach(v => {
          console.log(`  - ID: ${v._id}, User: ${v.user}, Status: ${v.status}, Desc: "${v.description}"`);
        });
      }
    }
    
    // Check ALL videos
    console.log('\n📊 Total videos in database:');
    const totalCount = await Video.countDocuments();
    console.log(`Total: ${totalCount}`);
    
    if (totalCount > 0) {
      const allVideos = await Video.find().limit(10).sort({ createdAt: -1 });
      console.log('\nRecent videos:');
      allVideos.forEach(v => {
        console.log(`  - ${v._id}: "${v.description || 'No description'}" (status: ${v.status}, user: ${v.user})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Connection closed\n');
  }
}

findSpecificVideos();
