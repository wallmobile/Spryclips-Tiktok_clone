const mongoose = require('mongoose');

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tiktok-clone';

// Enhanced connection options for better error handling
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 seconds timeout
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
};

mongoose.connect(mongoURI, connectionOptions)
  .then(() => {
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
    console.log(`📊 Database: ${mongoose.connection.name}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    
    // Provide helpful error messages
    if (err.message.includes('ECONNREFUSED') || err.message.includes('querySrv')) {
      console.error('');
      console.error('💡 This usually means:');
      console.error('   1. Your IP is not whitelisted in MongoDB Atlas');
      console.error('   2. MongoDB Atlas cluster is paused (free tier)');
      console.error('   3. Network connectivity issues');
      console.error('');
      console.error('   → Go to MongoDB Atlas → Network Access → Add your IP');
      console.error('   → Or use local MongoDB: mongodb://localhost:27017/tiktok-clone');
      console.error('');
      console.error('   Run: node scripts/test-mongo-connection.js to test connection');
      console.error('   See: docs/TROUBLESHOOTING.md for detailed help');
    } else if (err.message.includes('authentication failed')) {
      console.error('');
      console.error('💡 Authentication failed - check username/password in connection string');
    }
    
    console.error('');
    console.error('Full error:', err);
    process.exit(1);
  });

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

module.exports = mongoose;
