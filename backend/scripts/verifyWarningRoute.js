const mongoose = require('mongoose');
const WarningMessage = require('../models/WarningMessage');
require('dotenv').config();

const verifyWarningRoute = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_clone';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Check warnings in database
    const warnings = await WarningMessage.find().sort({ createdAt: -1 }).limit(10).lean();
    
    console.log(`\n✅ Found ${warnings.length} warnings in database:\n`);
    
    if (warnings.length === 0) {
      console.log('⚠️  No warnings found');
      console.log('💡 Run: node scripts/createTestWarning.js');
    } else {
      warnings.forEach((warning, index) => {
        console.log(`   Warning ${index + 1}:`);
        console.log(`   - ID: ${warning._id}`);
        console.log(`   - User ID: ${warning.userId}`);
        console.log(`   - Severity: ${warning.severity}`);
        console.log(`   - Violation: ${warning.violationType || 'N/A'}`);
        console.log(`   - Message: ${warning.message.substring(0, 60)}...`);
        console.log(`   - Status: ${warning.status}`);
        console.log(`   - Sent By: ${warning.sentBy || 'N/A'}`);
        console.log(`   - Sent At: ${warning.sentAt || warning.createdAt}`);
        console.log('');
      });
    }

    // Test route availability (if server is running)
    const axios = require('axios');
    const baseURL = 'http://localhost:5000';
    
    console.log('🔍 Testing route availability...');
    try {
      const response = await axios.get(`${baseURL}/api/admin/notifications/warnings`, {
        validateStatus: (status) => status < 500,
        timeout: 2000
      });
      
      if (response.status === 401) {
        console.log('✅ Route EXISTS! (401 = auth required - correct behavior)');
        console.log('💡 Route is working - just needs authentication');
      } else if (response.status === 200) {
        console.log('✅ Route EXISTS and working!');
        console.log(`   Found ${response.data.warnings?.length || 0} warnings via API`);
      } else {
        console.log(`⚠️  Route returned status: ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('⚠️  Backend server is NOT running');
        console.log('💡 Start backend server: cd backend && npm start');
      } else if (error.response?.status === 404) {
        console.log('❌ Route NOT FOUND (404)');
        console.log('💡 Backend server RESTART karo!');
      } else {
        console.log(`⚠️  Error: ${error.message}`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Verification completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

verifyWarningRoute();

