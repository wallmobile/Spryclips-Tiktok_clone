const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function checkRolesAndUsers() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const Role = require('../models/Role');
    const User = require('../models/User');

    // Check roles
    let roles = await Role.find().sort({ name: 1 });
    console.log(`📊 Roles in database: ${roles.length}`);
    
    if (roles.length === 0) {
      console.log('⚠️  No roles found. Creating default roles...\n');
      const defaultRoles = [
        { name: 'admin', displayName: 'Admin', permissions: ['all'], isSystem: true, description: 'Full access to all admin features' },
        { name: 'moderator', displayName: 'Moderator', permissions: ['content', 'moderation'], isSystem: true, description: 'Content and moderation access' },
        { name: 'finance', displayName: 'Finance', permissions: ['monetization', 'reports'], isSystem: true, description: 'Financial and reporting access' },
        { name: 'legal', displayName: 'Legal', permissions: ['compliance', 'reports'], isSystem: true, description: 'Compliance and legal access' }
      ];
      
      await Role.insertMany(defaultRoles);
      roles = await Role.find().sort({ name: 1 });
      console.log('✅ Default roles created!\n');
    }

    // Show all roles
    console.log('📋 All Roles:');
    for (const role of roles) {
      if (role.name === 'super_admin') continue;
      const userCount = await User.countDocuments({ role: role.name });
      console.log(`   - ${role.displayName} (${role.name}): ${userCount} users`);
      console.log(`     Permissions: ${role.permissions.join(', ')}`);
    }

    // Show user role distribution
    console.log('\n👥 User Role Distribution:');
    const roleCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    for (const rc of roleCounts) {
      console.log(`   - ${rc._id || '(no role)'}: ${rc.count} users`);
    }

    // Show sample users with their roles
    console.log('\n👤 Sample Users (first 10):');
    const sampleUsers = await User.find({}, 'username email role').limit(10);
    for (const user of sampleUsers) {
      console.log(`   - ${user.username} (${user.email}): role = "${user.role || 'null'}"`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkRolesAndUsers();

