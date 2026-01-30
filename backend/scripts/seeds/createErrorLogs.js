const mongoose = require('mongoose');
const ErrorLog = require('../models/ErrorLog');
const User = require('../models/User');

require('dotenv').config();

const createErrorLogs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Get a random user for userId
    const users = await User.find().limit(5);
    if (users.length === 0) {
      console.log('⚠️ No users found. Please create users first.');
      process.exit(1);
    }

    const errorLogs = [
      {
        level: 'critical',
        type: 'app-crash',
        severity: 'critical',
        message: 'Application crashed due to memory overflow',
        stack: 'Error: Out of memory\n    at processVideo (video.js:123)\n    at handleUpload (upload.js:45)',
        errorCode: 'MEM_OVERFLOW_001',
        userId: users[0]._id,
        endpoint: '/api/videos/upload',
        method: 'POST',
        responseStatus: 500,
        environment: 'production',
        serverId: 'api-server-01',
        serverType: 'api',
        browser: 'Chrome 120.0',
        os: 'Windows 11',
        device: 'Desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ipAddress: '192.168.1.100',
        occurrenceCount: 15,
        firstOccurred: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        lastOccurred: new Date(Date.now() - 1 * 60 * 60 * 1000),
        resolved: false,
        tags: ['memory', 'crash', 'video-processing']
      },
      {
        level: 'error',
        type: 'api-error',
        severity: 'high',
        message: 'Database connection timeout',
        stack: 'Error: Connection timeout\n    at connect (db.js:89)',
        errorCode: 'DB_TIMEOUT_002',
        userId: users[1]?._id || users[0]._id,
        endpoint: '/api/users/profile',
        method: 'GET',
        responseStatus: 503,
        environment: 'production',
        serverId: 'api-server-02',
        serverType: 'api',
        browser: 'Safari 17.0',
        os: 'macOS 14.0',
        device: 'Desktop',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        ipAddress: '192.168.1.101',
        occurrenceCount: 8,
        firstOccurred: new Date(Date.now() - 5 * 60 * 60 * 1000),
        lastOccurred: new Date(Date.now() - 30 * 60 * 1000),
        resolved: false,
        tags: ['database', 'timeout', 'connection']
      },
      {
        level: 'error',
        type: 'authentication-error',
        severity: 'medium',
        message: 'Invalid JWT token signature',
        stack: 'Error: Invalid token\n    at verifyToken (auth.js:45)',
        errorCode: 'AUTH_INVALID_003',
        userId: null,
        endpoint: '/api/videos/feed',
        method: 'GET',
        responseStatus: 401,
        environment: 'production',
        serverId: 'api-server-01',
        serverType: 'api',
        browser: 'Firefox 121.0',
        os: 'Linux',
        device: 'Desktop',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0)',
        ipAddress: '192.168.1.102',
        occurrenceCount: 23,
        firstOccurred: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        lastOccurred: new Date(Date.now() - 10 * 60 * 1000),
        resolved: false,
        tags: ['authentication', 'jwt', 'security']
      },
      {
        level: 'warning',
        type: 'validation-error',
        severity: 'low',
        message: 'Invalid video format submitted',
        stack: 'Error: Invalid format\n    at validateVideo (validator.js:78)',
        errorCode: 'VALID_FORMAT_004',
        userId: users[2]?._id || users[0]._id,
        endpoint: '/api/videos/upload',
        method: 'POST',
        responseStatus: 400,
        environment: 'production',
        serverId: 'api-server-01',
        serverType: 'api',
        browser: 'Chrome 120.0',
        os: 'Android 13',
        device: 'Mobile',
        userAgent: 'Mozilla/5.0 (Linux; Android 13)',
        ipAddress: '192.168.1.103',
        occurrenceCount: 5,
        firstOccurred: new Date(Date.now() - 3 * 60 * 60 * 1000),
        lastOccurred: new Date(Date.now() - 1 * 60 * 60 * 1000),
        resolved: true,
        resolvedAt: new Date(Date.now() - 30 * 60 * 1000),
        resolvedBy: users[0]._id,
        resolution: 'Updated validation rules to accept new format',
        tags: ['validation', 'video', 'format']
      },
      {
        level: 'critical',
        type: 'app-crash',
        severity: 'critical',
        message: 'Unhandled promise rejection in video processing',
        stack: 'Error: Unhandled rejection\n    at processVideo (processor.js:234)',
        errorCode: 'PROMISE_REJECT_005',
        userId: users[3]?._id || users[0]._id,
        endpoint: '/api/videos/process',
        method: 'POST',
        responseStatus: 500,
        environment: 'production',
        serverId: 'worker-server-01',
        serverType: 'worker',
        browser: 'Chrome 120.0',
        os: 'Windows 11',
        device: 'Desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.1.104',
        occurrenceCount: 3,
        firstOccurred: new Date(Date.now() - 6 * 60 * 60 * 1000),
        lastOccurred: new Date(Date.now() - 2 * 60 * 60 * 1000),
        resolved: false,
        tags: ['promise', 'crash', 'video-processing']
      },
      {
        level: 'error',
        type: 'network-error',
        severity: 'high',
        message: 'CDN connection failed',
        stack: 'Error: Network timeout\n    at fetchCDN (cdn.js:67)',
        errorCode: 'CDN_FAIL_006',
        userId: users[4]?._id || users[0]._id,
        endpoint: '/api/videos/stream',
        method: 'GET',
        responseStatus: 503,
        environment: 'production',
        serverId: 'media-server-01',
        serverType: 'media',
        browser: 'Safari 17.0',
        os: 'iOS 17.0',
        device: 'Mobile',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
        ipAddress: '192.168.1.105',
        occurrenceCount: 12,
        firstOccurred: new Date(Date.now() - 4 * 60 * 60 * 1000),
        lastOccurred: new Date(Date.now() - 45 * 60 * 1000),
        resolved: false,
        tags: ['cdn', 'network', 'streaming']
      },
      {
        level: 'error',
        type: 'database-error',
        severity: 'high',
        message: 'MongoDB query execution timeout',
        stack: 'Error: Query timeout\n    at executeQuery (db.js:234)',
        errorCode: 'DB_QUERY_TIMEOUT_007',
        userId: users[0]._id,
        endpoint: '/api/users/search',
        method: 'GET',
        responseStatus: 504,
        environment: 'production',
        serverId: 'api-server-02',
        serverType: 'api',
        browser: 'Edge 120.0',
        os: 'Windows 11',
        device: 'Desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.1.106',
        occurrenceCount: 7,
        firstOccurred: new Date(Date.now() - 8 * 60 * 60 * 1000),
        lastOccurred: new Date(Date.now() - 20 * 60 * 1000),
        resolved: false,
        tags: ['database', 'query', 'timeout']
      },
      {
        level: 'warning',
        type: 'third-party-error',
        severity: 'medium',
        message: 'Payment gateway API returned error',
        stack: 'Error: Payment failed\n    at processPayment (payment.js:89)',
        errorCode: 'PAYMENT_GATEWAY_008',
        userId: users[1]?._id || users[0]._id,
        endpoint: '/api/payments/process',
        method: 'POST',
        responseStatus: 502,
        environment: 'production',
        serverId: 'api-server-01',
        serverType: 'api',
        browser: 'Chrome 120.0',
        os: 'Windows 10',
        device: 'Desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.1.107',
        occurrenceCount: 4,
        firstOccurred: new Date(Date.now() - 12 * 60 * 60 * 1000),
        lastOccurred: new Date(Date.now() - 1 * 60 * 60 * 1000),
        resolved: false,
        tags: ['payment', 'third-party', 'gateway']
      }
    ];

    // Clear existing error logs (optional)
    const existingCount = await ErrorLog.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️ Found ${existingCount} existing error logs. Skipping creation.`);
      console.log('💡 To recreate, delete existing logs first.');
      process.exit(0);
    }

    // Insert error logs
    const created = await ErrorLog.insertMany(errorLogs);
    console.log(`✅ Created ${created.length} error logs`);

    // Display summary
    const stats = await ErrorLog.aggregate([
      {
        $group: {
          _id: { level: '$level', type: '$type', severity: '$severity' },
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n📊 Error Logs Summary:');
    stats.forEach(stat => {
      console.log(`   ${stat._id.level} | ${stat._id.type} | ${stat._id.severity}: ${stat.count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating error logs:', error);
    process.exit(1);
  }
};

createErrorLogs();

