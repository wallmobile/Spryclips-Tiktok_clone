const mongoose = require('mongoose');
require('dotenv').config();

const CDNHealth = require('../models/CDNHealth');

async function checkCDNHealth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Count total records
    const total = await CDNHealth.countDocuments();
    console.log(`\n📊 Total CDN Health Records: ${total}`);

    if (total === 0) {
      console.log('⚠️  No CDN health records found in database!');
      console.log('💡 Run: node backend/scripts/createCDNHealth.js');
      process.exit(0);
    }

    // Get all records
    const records = await CDNHealth.find().sort({ lastChecked: -1 });
    
    console.log('\n📋 CDN Health Records:');
    records.forEach((cdn, index) => {
      console.log(`\n${index + 1}. ${cdn.cdnProvider} - ${cdn.region}`);
      console.log(`   Status: ${cdn.status}`);
      console.log(`   Latency: ${cdn.qualityMetrics?.averageLatency || 0}ms`);
      console.log(`   Quality Drops: ${cdn.videoQuality?.qualityDropCount || 0}`);
      console.log(`   Last Checked: ${cdn.lastChecked}`);
    });

    // Statistics
    const healthy = await CDNHealth.countDocuments({ status: 'healthy' });
    const degraded = await CDNHealth.countDocuments({ status: 'degraded' });
    const warning = await CDNHealth.countDocuments({ status: 'warning' });
    const critical = await CDNHealth.countDocuments({ status: 'critical' });

    console.log('\n📈 Status Summary:');
    console.log(`   Healthy: ${healthy}`);
    console.log(`   Degraded: ${degraded}`);
    console.log(`   Warning: ${warning}`);
    console.log(`   Critical: ${critical}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking CDN health:', error);
    process.exit(1);
  }
}

checkCDNHealth();

