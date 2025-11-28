const mongoose = require('mongoose');
const Effect = require('../models/Effect');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone')
  .then(() => console.log('MongoDB connected for seeding effects'))
  .catch(err => console.error('MongoDB connection error:', err));

const sampleEffects = [
  // Face Category
  {
    name: 'Glow Up',
    description: 'Smooth skin with a natural glow effect',
    category: 'face',
    iconUrl: '✨',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: true,
    usageCount: 125000,
    favoritesCount: 45000,
    tags: ['beauty', 'glow', 'smooth', 'skin']
  },
  {
    name: 'Cat Face',
    description: 'Cute cat ears and whiskers',
    category: 'face',
    iconUrl: '🐱',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: true,
    usageCount: 98000,
    favoritesCount: 32000,
    tags: ['cute', 'animal', 'cat', 'fun']
  },
  {
    name: 'Golden Hour',
    description: 'Warm golden light effect',
    category: 'filter',
    iconUrl: '🌅',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: true,
    usageCount: 87000,
    favoritesCount: 28000,
    tags: ['warm', 'golden', 'sunset', 'aesthetic']
  },
  // Beauty Category
  {
    name: 'Soft Skin',
    description: 'Professional skin smoothing filter',
    category: 'face',
    iconUrl: '💄',
    thumbnailUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&h=300&fit=crop',
    isPremium: true,
    isFeatured: false,
    usageCount: 65000,
    favoritesCount: 22000,
    tags: ['beauty', 'skin', 'smooth', 'professional']
  },
  {
    name: 'Sparkle Eyes',
    description: 'Add sparkle to your eyes',
    category: 'face',
    iconUrl: '👁️',
    thumbnailUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: false,
    usageCount: 54000,
    favoritesCount: 18000,
    tags: ['eyes', 'sparkle', 'beauty', 'shine']
  },
  // Funny Category
  {
    name: 'Big Head',
    description: 'Hilarious big head effect',
    category: 'face',
    iconUrl: '😂',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: true,
    usageCount: 112000,
    favoritesCount: 38000,
    tags: ['funny', 'comedy', 'big', 'head']
  },
  {
    name: 'Voice Changer',
    description: 'Change your voice to various styles',
    category: 'sound',
    iconUrl: '🎤',
    thumbnailUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: false,
    usageCount: 78000,
    favoritesCount: 25000,
    tags: ['voice', 'sound', 'fun', 'audio']
  },
  // AR Category
  {
    name: 'Bunny Ears',
    description: 'Cute animated bunny ears',
    category: 'ar',
    iconUrl: '🐰',
    thumbnailUrl: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: true,
    usageCount: 95000,
    favoritesCount: 35000,
    tags: ['ar', 'bunny', 'cute', 'ears']
  },
  {
    name: 'Devil Horns',
    description: 'Animated devil horns with fire',
    category: 'ar',
    iconUrl: '😈',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: false,
    usageCount: 67000,
    favoritesCount: 21000,
    tags: ['ar', 'devil', 'fire', 'cool']
  },
  {
    name: 'Angel Halo',
    description: 'Glowing angel halo above head',
    category: 'ar',
    iconUrl: '😇',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: false,
    usageCount: 58000,
    favoritesCount: 19000,
    tags: ['ar', 'angel', 'halo', 'glow']
  },
  // Background Category
  {
    name: 'Beach Vibes',
    description: 'Virtual beach background',
    category: 'background',
    iconUrl: '🏖️',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: true,
    usageCount: 82000,
    favoritesCount: 27000,
    tags: ['beach', 'summer', 'background', 'virtual']
  },
  {
    name: 'City Lights',
    description: 'Night city skyline background',
    category: 'background',
    iconUrl: '🌃',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: false,
    usageCount: 61000,
    favoritesCount: 20000,
    tags: ['city', 'night', 'lights', 'urban']
  },
  {
    name: 'Nature Forest',
    description: 'Beautiful forest scenery',
    category: 'background',
    iconUrl: '🌲',
    thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: false,
    usageCount: 55000,
    favoritesCount: 18000,
    tags: ['nature', 'forest', 'trees', 'green']
  },
  // Filter Category
  {
    name: 'Vintage Film',
    description: 'Classic vintage film look',
    category: 'filter',
    iconUrl: '📷',
    thumbnailUrl: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: true,
    usageCount: 91000,
    favoritesCount: 31000,
    tags: ['vintage', 'film', 'retro', 'classic']
  },
  {
    name: 'Cyberpunk',
    description: 'Neon cyberpunk aesthetic',
    category: 'filter',
    iconUrl: '🌆',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop',
    isPremium: true,
    isFeatured: true,
    usageCount: 73000,
    favoritesCount: 26000,
    tags: ['cyberpunk', 'neon', 'future', 'aesthetic']
  },
  {
    name: 'Black & White',
    description: 'Classic black and white filter',
    category: 'filter',
    iconUrl: '⬛',
    thumbnailUrl: 'https://images.unsplash.com/photo-1489844097929-c8d5b91c456e?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: false,
    usageCount: 68000,
    favoritesCount: 22000,
    tags: ['black', 'white', 'monochrome', 'classic']
  },
  // Trending Effects
  {
    name: 'Rainbow Trail',
    description: 'Colorful rainbow trailing effect',
    category: 'ar',
    iconUrl: '🌈',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: true,
    usageCount: 156000,
    favoritesCount: 52000,
    tags: ['rainbow', 'colorful', 'trail', 'trending']
  },
  {
    name: 'Snow Fall',
    description: 'Gentle falling snow overlay',
    category: 'ar',
    iconUrl: '❄️',
    thumbnailUrl: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: false,
    usageCount: 89000,
    favoritesCount: 29000,
    tags: ['snow', 'winter', 'cold', 'overlay']
  },
  {
    name: 'Heart Particles',
    description: 'Floating heart particles',
    category: 'ar',
    iconUrl: '💕',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: true,
    usageCount: 134000,
    favoritesCount: 48000,
    tags: ['hearts', 'love', 'romantic', 'particles']
  },
  {
    name: 'VHS Retro',
    description: 'VHS tape distortion effect',
    category: 'filter',
    iconUrl: '📼',
    thumbnailUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=300&h=300&fit=crop',
    isPremium: false,
    isFeatured: false,
    usageCount: 76000,
    favoritesCount: 24000,
    tags: ['vhs', 'retro', 'glitch', '80s']
  }
];

const seedEffects = async () => {
  try {
    // Check if effects already exist
    const existingCount = await Effect.countDocuments();
    
    if (existingCount > 0) {
      console.log(`✅ Effects already exist (${existingCount} effects). Skipping seed.`);
      process.exit(0);
    }

    // Insert sample effects
    await Effect.insertMany(sampleEffects);
    console.log(`✅ Successfully seeded ${sampleEffects.length} effects!`);
    
    // Show categories
    const categories = await Effect.distinct('category');
    console.log(`📂 Categories: ${categories.join(', ')}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding effects:', error);
    process.exit(1);
  }
};

seedEffects();


