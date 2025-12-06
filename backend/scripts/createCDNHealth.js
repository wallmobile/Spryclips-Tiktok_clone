const mongoose = require('mongoose');
require('dotenv').config();

const CDNHealth = require('../models/CDNHealth');

const sampleCDNHealthData = [
  {
    cdnProvider: 'cloudflare',
    region: 'US-East',
    status: 'healthy',
    lastChecked: new Date(),
    qualityMetrics: {
      averageLatency: 45,
      averageBitrate: 8500,
      bufferHealth: 95,
      resolutionDropRate: 0.5,
      connectionFailures: 2
    },
    streamingStats: {
      totalStreams: 50000,
      activeStreams: 35000,
      failedStreams: 50,
      averageWatchTime: 180,
      rebufferRate: 0.02
    },
    videoQuality: {
      hdAvailable: true,
      sdAvailable: true,
      adaptiveEnabled: true,
      qualityDropCount: 0,
      qualityRestoreCount: 0
    },
    bandwidth: {
      total: 1500, // MB/s
      used: 1250,
      available: 250,
      utilization: 83.33
    }
  },
  {
    cdnProvider: 'aws-cloudfront',
    region: 'US-West',
    status: 'healthy',
    lastChecked: new Date(),
    qualityMetrics: {
      averageLatency: 52,
      averageBitrate: 8200,
      bufferHealth: 92,
      resolutionDropRate: 1.2,
      connectionFailures: 5
    },
    streamingStats: {
      totalStreams: 42000,
      activeStreams: 30000,
      failedStreams: 80,
      averageWatchTime: 165,
      rebufferRate: 0.03
    },
    videoQuality: {
      hdAvailable: true,
      sdAvailable: true,
      adaptiveEnabled: true,
      qualityDropCount: 2,
      qualityRestoreCount: 2
    },
    bandwidth: {
      total: 1200,
      used: 980,
      available: 220,
      utilization: 81.67
    }
  },
  {
    cdnProvider: 'cloudflare',
    region: 'EU-Central',
    status: 'degraded',
    lastChecked: new Date(),
    qualityMetrics: {
      averageLatency: 78,
      averageBitrate: 7200,
      bufferHealth: 75,
      resolutionDropRate: 5.5,
      connectionFailures: 25
    },
    streamingStats: {
      totalStreams: 32000,
      activeStreams: 22000,
      failedStreams: 200,
      averageWatchTime: 140,
      rebufferRate: 0.08
    },
    videoQuality: {
      hdAvailable: true,
      sdAvailable: true,
      adaptiveEnabled: true,
      qualityDropCount: 15,
      qualityRestoreCount: 8
    },
    bandwidth: {
      total: 1000,
      used: 750,
      available: 250,
      utilization: 75.0
    },
    issues: [{
      type: 'latency',
      severity: 'medium',
      description: 'Increased latency in EU-Central region',
      affectedUsers: 5000,
      startedAt: new Date(Date.now() - 3600000),
      resolution: 'Investigating network routing issues'
    }]
  },
  {
    cdnProvider: 'cloudflare',
    region: 'Asia-Pacific',
    status: 'healthy',
    lastChecked: new Date(),
    qualityMetrics: {
      averageLatency: 65,
      averageBitrate: 8000,
      bufferHealth: 88,
      resolutionDropRate: 1.8,
      connectionFailures: 8
    },
    streamingStats: {
      totalStreams: 48000,
      activeStreams: 34000,
      failedStreams: 100,
      averageWatchTime: 170,
      rebufferRate: 0.025
    },
    videoQuality: {
      hdAvailable: true,
      sdAvailable: true,
      adaptiveEnabled: true,
      qualityDropCount: 1,
      qualityRestoreCount: 1
    },
    bandwidth: {
      total: 1300,
      used: 1100,
      available: 200,
      utilization: 84.62
    }
  },
  {
    cdnProvider: 'cloudflare',
    region: 'EU-West',
    status: 'healthy',
    lastChecked: new Date(),
    qualityMetrics: {
      averageLatency: 48,
      averageBitrate: 8600,
      bufferHealth: 94,
      resolutionDropRate: 0.8,
      connectionFailures: 3
    },
    streamingStats: {
      totalStreams: 45000,
      activeStreams: 32000,
      failedStreams: 60,
      averageWatchTime: 175,
      rebufferRate: 0.018
    },
    videoQuality: {
      hdAvailable: true,
      sdAvailable: true,
      adaptiveEnabled: true,
      qualityDropCount: 0,
      qualityRestoreCount: 0
    },
    bandwidth: {
      total: 1250,
      used: 1050,
      available: 200,
      utilization: 84.0
    }
  },
  {
    cdnProvider: 'aws-cloudfront',
    region: 'Asia-South',
    status: 'degraded',
    lastChecked: new Date(),
    qualityMetrics: {
      averageLatency: 95,
      averageBitrate: 6800,
      bufferHealth: 65,
      resolutionDropRate: 8.5,
      connectionFailures: 45
    },
    streamingStats: {
      totalStreams: 28000,
      activeStreams: 18000,
      failedStreams: 350,
      averageWatchTime: 120,
      rebufferRate: 0.12
    },
    videoQuality: {
      hdAvailable: true,
      sdAvailable: true,
      adaptiveEnabled: true,
      qualityDropCount: 8,
      qualityRestoreCount: 5
    },
    bandwidth: {
      total: 900,
      used: 650,
      available: 250,
      utilization: 72.22
    },
    issues: [{
      type: 'quality-drop',
      severity: 'high',
      description: 'High quality drop rate in Asia-South region',
      affectedUsers: 8000,
      startedAt: new Date(Date.now() - 7200000),
      resolution: 'Scaling up capacity'
    }]
  }
];

async function createCDNHealthData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing CDN health data (optional - comment out if you want to keep existing data)
    const deleted = await CDNHealth.deleteMany({});
    console.log(`🗑️  Deleted ${deleted.deletedCount} existing CDN health records`);

    // Insert sample data
    const result = await CDNHealth.insertMany(sampleCDNHealthData);
    console.log(`✅ Created ${result.length} CDN health records`);

    // Display created records
    console.log('\n📊 Created CDN Health Records:');
    result.forEach((cdn, index) => {
      console.log(`${index + 1}. ${cdn.cdnProvider} - ${cdn.region} (${cdn.status})`);
    });

    console.log('\n✅ CDN Health data created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating CDN health data:', error);
    process.exit(1);
  }
}

createCDNHealthData();

