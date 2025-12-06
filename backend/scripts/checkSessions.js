const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function checkSessions() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const Session = require('../models/Session');
    const User = require('../models/User');

    const activeCount = await Session.countDocuments({ isActive: true });
    const totalCount = await Session.countDocuments();
    console.log(`📊 Active sessions: ${activeCount}`);
    console.log(`📊 Total sessions: ${totalCount}\n`);

    if (activeCount === 0) {
      console.log('⚠️  No active sessions found!');
      console.log('Creating sample session...\n');
      
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        const session = await Session.create({
          user: admin._id,
          token: require('crypto').randomBytes(32).toString('hex'),
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          device: 'Desktop',
          browser: 'Chrome',
          os: 'Windows',
          location: 'Local',
          isActive: true,
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
        });
        console.log('✅ Created sample session');
      }
    }

    const sessions = await Session.find({ isActive: true })
      .populate('user', 'username email role')
      .sort({ lastActivity: -1 })
      .limit(10);

    console.log(`\n📋 Active Sessions (${sessions.length}):\n`);
    sessions.forEach((session, i) => {
      const loginTime = new Date(session.createdAt).toLocaleString();
      const lastActivity = new Date(session.lastActivity).toLocaleString();
      console.log(`${i + 1}. User: ${session.user?.username || 'N/A'} (${session.user?.email || 'N/A'})`);
      console.log(`   IP: ${session.ipAddress || 'N/A'}, Device: ${session.device || session.userAgent || 'N/A'}`);
      console.log(`   Login: ${loginTime}, Last Activity: ${lastActivity}\n`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkSessions();

