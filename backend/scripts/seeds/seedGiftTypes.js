const mongoose = require('mongoose');
const GiftType = require('../models/GiftType');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/tiktok_clone';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

const sampleGiftTypes = [
  {
    name: 'Heart',
    description: 'A simple heart to show your love',
    image: '❤️',
    value: 1,
    category: 'hearts',
    rarity: 'common',
    sortOrder: 1,
  },
  {
    name: 'Rose',
    description: 'A beautiful red rose',
    image: '🌹',
    value: 5,
    category: 'flowers',
    rarity: 'common',
    sortOrder: 2,
  },
  {
    name: 'Fire',
    description: 'You are on fire!',
    image: '🔥',
    value: 10,
    category: 'sparkles',
    rarity: 'rare',
    sortOrder: 3,
  },
  {
    name: 'Diamond',
    description: 'A precious diamond gift',
    image: '💎',
    value: 50,
    category: 'luxury',
    rarity: 'epic',
    sortOrder: 4,
  },
  {
    name: 'Crown',
    description: 'You deserve a crown!',
    image: '👑',
    value: 100,
    category: 'luxury',
    rarity: 'legendary',
    sortOrder: 5,
  },
  {
    name: 'Cat',
    description: 'Cute cat emoji',
    image: '🐱',
    value: 15,
    category: 'animals',
    rarity: 'rare',
    sortOrder: 6,
  },
  {
    name: 'Sparkles',
    description: 'Magical sparkles',
    image: '✨',
    value: 20,
    category: 'sparkles',
    rarity: 'rare',
    sortOrder: 7,
  },
  {
    name: 'Rocket',
    description: 'To the moon!',
    image: '🚀',
    value: 25,
    category: 'sparkles',
    rarity: 'epic',
    sortOrder: 8,
  },
];

const seedGiftTypes = async () => {
  try {
    await connectDB();
    
    // Clear existing gift types
    await GiftType.deleteMany({});
    
    // Insert sample gift types
    const createdGifts = await GiftType.insertMany(sampleGiftTypes);
    
    console.log('✅ Gift types seeded successfully!');
    console.log(`📦 Created ${createdGifts.length} gift types`);
    
    createdGifts.forEach(gift => {
      console.log(`   - ${gift.name} (${gift.value} coins, ${gift.rarity})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding gift types:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedGiftTypes();
}

module.exports = { seedGiftTypes, sampleGiftTypes };