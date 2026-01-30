require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Storage = require('../models/Storage');

const createStorage = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone');
    console.log('✅ Connected to MongoDB');

    const storageData = [
      {
        storageType: 's3',
        bucketName: 'tiktok-videos-prod',
        region: 'us-east-1',
        totalCapacity: 5000, // 5TB
        used: 3750, // 3.75TB
        available: 1250, // 1.25TB
        utilization: 75.0,
        files: {
          total: 1250000,
          videos: 850000,
          images: 250000,
          thumbnails: 100000,
          audio: 30000,
          documents: 15000,
          other: 5000
        },
        sizeByType: {
          videos: 3000, // 3TB
          images: 500, // 500GB
          thumbnails: 150, // 150GB
          audio: 50, // 50GB
          documents: 30, // 30GB
          other: 20 // 20GB
        },
        uploads: {
          today: 1250,
          thisWeek: 8750,
          thisMonth: 37500,
          total: 1250000
        },
        deletions: {
          today: 50,
          thisWeek: 350,
          thisMonth: 1500,
          total: 50000
        },
        alerts: [],
        health: {
          status: 'healthy',
          lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          backupFrequency: 'daily',
          redundancy: true
        },
        costs: {
          monthly: 1250.50,
          daily: 41.68,
          perGB: 0.023
        },
        lastChecked: new Date()
      },
      {
        storageType: 'cloudinary',
        bucketName: 'spryclips-media',
        region: 'global',
        totalCapacity: 2000, // 2TB
        used: 1600, // 1.6TB
        available: 400, // 400GB
        utilization: 80.0,
        files: {
          total: 850000,
          videos: 500000,
          images: 250000,
          thumbnails: 80000,
          audio: 15000,
          documents: 3000,
          other: 2000
        },
        sizeByType: {
          videos: 1200, // 1.2TB
          images: 300, // 300GB
          thumbnails: 80, // 80GB
          audio: 15, // 15GB
          documents: 3, // 3GB
          other: 2 // 2GB
        },
        uploads: {
          today: 850,
          thisWeek: 5950,
          thisMonth: 25500,
          total: 850000
        },
        deletions: {
          today: 30,
          thisWeek: 210,
          thisMonth: 900,
          total: 30000
        },
        alerts: [{
          type: 'capacity-warning',
          severity: 'warning',
          message: 'Storage utilization is above 75%',
          threshold: 75,
          currentValue: 80,
          triggeredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }],
        health: {
          status: 'warning',
          lastBackup: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
          backupFrequency: 'daily',
          redundancy: true
        },
        costs: {
          monthly: 850.25,
          daily: 28.34,
          perGB: 0.042
        },
        lastChecked: new Date()
      },
      {
        storageType: 'local',
        bucketName: 'local-storage',
        region: 'server-1',
        totalCapacity: 1000, // 1TB
        used: 850, // 850GB
        available: 150, // 150GB
        utilization: 85.0,
        files: {
          total: 450000,
          videos: 250000,
          images: 150000,
          thumbnails: 40000,
          audio: 8000,
          documents: 1500,
          other: 500
        },
        sizeByType: {
          videos: 600, // 600GB
          images: 180, // 180GB
          thumbnails: 50, // 50GB
          audio: 12, // 12GB
          documents: 5, // 5GB
          other: 3 // 3GB
        },
        uploads: {
          today: 600,
          thisWeek: 4200,
          thisMonth: 18000,
          total: 450000
        },
        deletions: {
          today: 25,
          thisWeek: 175,
          thisMonth: 750,
          total: 25000
        },
        alerts: [{
          type: 'capacity-warning',
          severity: 'warning',
          message: 'Storage utilization is above 80%',
          threshold: 80,
          currentValue: 85,
          triggeredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        }],
        health: {
          status: 'warning',
          lastBackup: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
          backupFrequency: 'daily',
          redundancy: false
        },
        costs: {
          monthly: 0, // Local storage
          daily: 0,
          perGB: 0
        },
        lastChecked: new Date()
      },
      {
        storageType: 'azure',
        bucketName: 'tiktok-backup',
        region: 'east-us',
        totalCapacity: 3000, // 3TB
        used: 2100, // 2.1TB
        available: 900, // 900GB
        utilization: 70.0,
        files: {
          total: 950000,
          videos: 600000,
          images: 250000,
          thumbnails: 80000,
          audio: 15000,
          documents: 4000,
          other: 1000
        },
        sizeByType: {
          videos: 1800, // 1.8TB
          images: 220, // 220GB
          thumbnails: 60, // 60GB
          audio: 12, // 12GB
          documents: 5, // 5GB
          other: 3 // 3GB
        },
        uploads: {
          today: 950,
          thisWeek: 6650,
          thisMonth: 28500,
          total: 950000
        },
        deletions: {
          today: 40,
          thisWeek: 280,
          thisMonth: 1200,
          total: 40000
        },
        alerts: [],
        health: {
          status: 'healthy',
          lastBackup: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          backupFrequency: 'twice-daily',
          redundancy: true
        },
        costs: {
          monthly: 1050.75,
          daily: 35.03,
          perGB: 0.035
        },
        lastChecked: new Date()
      },
      {
        storageType: 'gcp',
        bucketName: 'tiktok-archive',
        region: 'us-central1',
        totalCapacity: 1500, // 1.5TB
        used: 1200, // 1.2TB
        available: 300, // 300GB
        utilization: 80.0,
        files: {
          total: 600000,
          videos: 400000,
          images: 150000,
          thumbnails: 40000,
          audio: 8000,
          documents: 1500,
          other: 500
        },
        sizeByType: {
          videos: 900, // 900GB
          images: 220, // 220GB
          thumbnails: 60, // 60GB
          audio: 12, // 12GB
          documents: 3, // 3GB
          other: 2 // 2GB
        },
        uploads: {
          today: 700,
          thisWeek: 4900,
          thisMonth: 21000,
          total: 600000
        },
        deletions: {
          today: 35,
          thisWeek: 245,
          thisMonth: 1050,
          total: 35000
        },
        alerts: [{
          type: 'capacity-warning',
          severity: 'warning',
          message: 'Storage utilization is above 75%',
          threshold: 75,
          currentValue: 80,
          triggeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }],
        health: {
          status: 'warning',
          lastBackup: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
          backupFrequency: 'daily',
          redundancy: true
        },
        costs: {
          monthly: 630.50,
          daily: 21.02,
          perGB: 0.042
        },
        lastChecked: new Date()
      }
    ];

    await Storage.deleteMany({}); // Clear existing storage
    await Storage.insertMany(storageData);
    console.log(`✅ Created ${storageData.length} storage records`);

    const stats = await Storage.aggregate([
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$totalCapacity' },
          totalUsed: { $sum: '$used' },
          totalAvailable: { $sum: '$available' },
          avgUtilization: { $avg: '$utilization' }
        }
      }
    ]);
    console.log('\n📊 Storage Summary:');
    console.log(`   Total Capacity: ${(stats[0].totalCapacity / 1000).toFixed(2)} TB`);
    console.log(`   Total Used: ${(stats[0].totalUsed / 1000).toFixed(2)} TB`);
    console.log(`   Total Available: ${(stats[0].totalAvailable / 1000).toFixed(2)} TB`);
    console.log(`   Average Utilization: ${stats[0].avgUtilization.toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error creating storage:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

createStorage();

