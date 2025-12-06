const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function checkActivityLogs() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const ActivityLog = require('../models/ActivityLog');
    const User = require('../models/User');

    const count = await ActivityLog.countDocuments();
    console.log(`📊 Total activity logs in database: ${count}\n`);

    if (count === 0) {
      console.log('⚠️  No activity logs found in database!');
      console.log('Creating sample logs...\n');
      
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        await ActivityLog.create({
          user: admin._id,
          action: 'login',
          resource: 'auth',
          details: 'Admin logged in',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          status: 'success'
        });
        console.log('✅ Created sample login log');
      }
    }

    const logs = await ActivityLog.find()
      .populate('user', 'username email role')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`\n📋 Recent ${logs.length} activity logs:\n`);
    logs.forEach((log, i) => {
      const date = new Date(log.createdAt).toLocaleString();
      console.log(`${i + 1}. User: ${log.user?.username || 'N/A'} (${log.user?.email || 'N/A'})`);
      console.log(`   Action: ${log.action}, Resource: ${log.resource}`);
      console.log(`   IP: ${log.ipAddress || 'N/A'}, Status: ${log.status}`);
      console.log(`   Date: ${date}\n`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkActivityLogs();

