require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Storage = require('../models/Storage');

const checkStorage = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone');
    console.log('✅ Connected to MongoDB');

    const storage = await Storage.find({}).sort({ lastChecked: -1 });
    console.log(`\n📦 Found ${storage.length} storage records:\n`);

    storage.forEach((stor, idx) => {
      console.log(`${idx + 1}. ${stor.storageType.toUpperCase()}`);
      console.log(`   Bucket: ${stor.bucketName || 'N/A'}`);
      console.log(`   Region: ${stor.region || 'N/A'}`);
      console.log(`   Capacity: ${(stor.totalCapacity / 1000).toFixed(2)} TB (${stor.totalCapacity.toFixed(0)} GB)`);
      console.log(`   Used: ${(stor.used / 1000).toFixed(2)} TB (${stor.used.toFixed(0)} GB)`);
      console.log(`   Available: ${(stor.available / 1000).toFixed(2)} TB (${stor.available.toFixed(0)} GB)`);
      console.log(`   Utilization: ${stor.utilization.toFixed(1)}%`);
      console.log(`   Files: ${stor.files?.total?.toLocaleString() || 0}`);
      console.log(`   Health: ${stor.health?.status || 'N/A'}`);
      console.log(`   Alerts: ${stor.alerts?.filter(a => !a.resolvedAt).length || 0} active`);
      console.log(`   Monthly Cost: $${stor.costs?.monthly?.toFixed(2) || '0.00'}`);
      console.log('');
    });

    const stats = await Storage.aggregate([
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$totalCapacity' },
          totalUsed: { $sum: '$used' },
          totalAvailable: { $sum: '$available' },
          avgUtilization: { $avg: '$utilization' },
          totalFiles: { $sum: '$files.total' },
          totalMonthlyCost: { $sum: '$costs.monthly' }
        }
      }
    ]);

    if (stats[0]) {
      console.log('📊 Overall Statistics:');
      console.log(`   Total Capacity: ${(stats[0].totalCapacity / 1000).toFixed(2)} TB`);
      console.log(`   Total Used: ${(stats[0].totalUsed / 1000).toFixed(2)} TB`);
      console.log(`   Total Available: ${(stats[0].totalAvailable / 1000).toFixed(2)} TB`);
      console.log(`   Average Utilization: ${stats[0].avgUtilization.toFixed(1)}%`);
      console.log(`   Total Files: ${stats[0].totalFiles?.toLocaleString() || 0}`);
      console.log(`   Total Monthly Cost: $${stats[0].totalMonthlyCost?.toFixed(2) || '0.00'}`);
    }

  } catch (error) {
    console.error('❌ Error checking storage:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

checkStorage();

