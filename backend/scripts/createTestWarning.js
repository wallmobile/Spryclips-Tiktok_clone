const mongoose = require('mongoose');
const User = require('../models/User');
const WarningMessage = require('../models/WarningMessage');
require('dotenv').config();

const createTestWarning = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Get a test user (target user)
    const targetUser = await User.findOne();
    if (!targetUser) {
      console.log('❌ No users found in database');
      console.log('💡 Please create a user first');
      process.exit(1);
    }

    // Get admin user (sender)
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No admin user found');
      process.exit(1);
    }

    console.log(`\n✅ Test Data:`);
    console.log(`   Target User: ${targetUser.username} (${targetUser.email})`);
    console.log(`   Admin User: ${adminUser.username} (${adminUser.email})`);

    // Create test warning messages
    const testWarnings = [
      {
        userId: targetUser._id,
        severity: 'minor',
        message: 'This is a minor warning - please follow community guidelines.',
        violationType: 'spam',
        status: 'sent',
        sentAt: new Date(),
        sentBy: adminUser._id
      },
      {
        userId: targetUser._id,
        severity: 'moderate',
        message: 'This is a moderate warning - repeated violations may result in account suspension.',
        violationType: 'inappropriate_content',
        status: 'sent',
        sentAt: new Date(Date.now() - 86400000), // 1 day ago
        sentBy: adminUser._id
      },
      {
        userId: targetUser._id,
        severity: 'severe',
        message: 'This is a severe warning - your account is at risk of being banned.',
        violationType: 'harassment',
        status: 'sent',
        sentAt: new Date(Date.now() - 172800000), // 2 days ago
        sentBy: adminUser._id
      }
    ];

    // Clear existing test warnings
    await WarningMessage.deleteMany({ violationType: { $in: ['spam', 'inappropriate_content', 'harassment'] } });
    console.log('\n🧹 Cleared old test warnings');

    // Insert test warnings
    const createdWarnings = await WarningMessage.insertMany(testWarnings);
    console.log(`\n✅ Created ${createdWarnings.length} test warnings:`);
    
    createdWarnings.forEach((warning, index) => {
      console.log(`\n   Warning ${index + 1}:`);
      console.log(`   - ID: ${warning._id}`);
      console.log(`   - Severity: ${warning.severity}`);
      console.log(`   - Violation Type: ${warning.violationType}`);
      console.log(`   - Message: ${warning.message.substring(0, 50)}...`);
      console.log(`   - Status: ${warning.status}`);
      console.log(`   - Sent At: ${warning.sentAt}`);
    });

    // Verify in database
    const count = await WarningMessage.countDocuments({ userId: targetUser._id });
    console.log(`\n✅ Total warnings for user: ${count}`);

    console.log(`\n✅ Test data created successfully!`);
    console.log(`\n💡 Now test the route:`);
    console.log(`   1. Make sure backend server is running`);
    console.log(`   2. Login to admin panel`);
    console.log(`   3. Go to "Notifications Control → Warning Messages"`);
    console.log(`   4. You should see ${count} warnings`);
    console.log(`\n💡 Or test via API:`);
    console.log(`   GET http://localhost:5000/api/admin/notifications/warnings`);

    await mongoose.disconnect();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

createTestWarning();

