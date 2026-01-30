const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function createActivityLogs() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const ActivityLog = require('../models/ActivityLog');
    const User = require('../models/User');

    // Check existing logs
    const existingCount = await ActivityLog.countDocuments();
    console.log(`📊 Existing activity logs: ${existingCount}\n`);

    // Get admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('❌ Admin user not found!');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`👤 Using admin user: ${admin.username} (${admin.email})\n`);

    // Create sample activity logs
    const sampleLogs = [
      {
        user: admin._id,
        action: 'login',
        resource: 'auth',
        details: 'Admin logged in successfully',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        status: 'success'
      },
      {
        user: admin._id,
        action: 'view',
        resource: 'dashboard',
        details: 'Viewed admin dashboard',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        status: 'success'
      },
      {
        user: admin._id,
        action: 'view',
        resource: 'security',
        details: 'Viewed security settings',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        status: 'success'
      },
      {
        user: admin._id,
        action: 'view',
        resource: 'roles',
        details: 'Viewed role-based access control',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        status: 'success'
      },
      {
        user: admin._id,
        action: 'view',
        resource: 'activity-logs',
        details: 'Viewed activity logs',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        status: 'success'
      }
    ];

    // Create logs with different timestamps (last 7 days)
    const now = new Date();
    for (let i = 0; i < sampleLogs.length; i++) {
      const logData = {
        ...sampleLogs[i],
        createdAt: new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)), // Spread over last few days
        updatedAt: new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
      };
      
      await ActivityLog.create(logData);
      console.log(`✅ Created log: ${logData.action} - ${logData.resource} (${logData.createdAt.toLocaleDateString()})`);
    }

    const finalCount = await ActivityLog.countDocuments();
    console.log(`\n📊 Total activity logs now: ${finalCount}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createActivityLogs();

