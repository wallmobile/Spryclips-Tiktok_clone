const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('./models/Notification');
const User = require('./models/User');

async function checkNotifications() {
  console.log('🚀 Starting notification check script...\n');
  
  try {
    // Connect to MongoDB - use same connection string as backend
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';
    console.log(`🔌 Connecting to MongoDB...`);
    console.log(`   URI: ${mongoUri.replace(/\/\/.*@/, '//***@')}\n`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Get user ID from command line or use default
    const userId = process.argv[2] || '693b118609dea5aafb695a10';
    console.log(`\n📊 Checking notifications for user: ${userId}\n`);
    
    // Find all notifications for this user
    const allNotifications = await Notification.find({ user: userId })
      .populate('relatedUser', 'username')
      .sort({ createdAt: -1 })
      .limit(20);
    
    console.log(`📬 Total notifications found: ${allNotifications.length}\n`);
    
    // Filter likes notifications
    const likesNotifications = allNotifications.filter(n => n.type === 'likes');
    console.log(`❤️ Likes notifications: ${likesNotifications.length}\n`);
    
    if (likesNotifications.length > 0) {
      console.log('📋 Recent likes notifications:');
      likesNotifications.forEach((notif, index) => {
        console.log(`\n${index + 1}. Notification ID: ${notif._id}`);
        console.log(`   Type: ${notif.type}`);
        console.log(`   Title: ${notif.title}`);
        console.log(`   Message: ${notif.message}`);
        console.log(`   Created: ${notif.createdAt}`);
        console.log(`   Is Read: ${notif.isRead}`);
        console.log(`   Related User: ${notif.relatedUser?.username || notif.relatedUser?._id || 'N/A'}`);
        console.log(`   Metadata:`, notif.metadata || {});
      });
    } else {
      console.log('⚠️ No likes notifications found');
    }
    
    // Check for story-related notifications
    const storyNotifications = allNotifications.filter(n => 
      n.metadata && n.metadata.get && n.metadata.get('storyId')
    );
    console.log(`\n📖 Story-related notifications: ${storyNotifications.length}`);
    
    if (storyNotifications.length > 0) {
      console.log('\n📋 Story notifications:');
      storyNotifications.forEach((notif, index) => {
        console.log(`\n${index + 1}. ${notif.type} - ${notif.message}`);
        console.log(`   Story ID: ${notif.metadata.get('storyId')}`);
        console.log(`   Created: ${notif.createdAt}`);
      });
    }
    
    // Check total notifications count
    const totalCount = await Notification.countDocuments({ user: userId });
    const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total notifications: ${totalCount}`);
    console.log(`   Unread notifications: ${unreadCount}`);
    console.log(`   Likes notifications: ${likesNotifications.length}`);
    console.log(`   Story notifications: ${storyNotifications.length}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkNotifications();

