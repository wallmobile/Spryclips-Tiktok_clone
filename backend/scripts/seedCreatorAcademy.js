const mongoose = require('mongoose');
const { CreatorAcademy, LearningPath } = require('../models/CreatorAcademy');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';

const sampleContent = [
  {
    title: 'How to Go Viral on TikTok',
    description: 'Learn the secrets behind viral TikTok videos. Discover timing, trends, and content strategies that actually work.',
    type: 'tutorial',
    category: 'Growth',
    tags: ['viral', 'growth', 'algorithm'],
    difficulty: 'beginner',
    duration: 15,
    views: 125000,
    likes: 8500,
    isPublished: true,
    featured: true
  },
  {
    title: 'Video Editing Masterclass',
    description: 'Master professional video editing techniques using CapCut, InShot, and TikTok\'s built-in editor.',
    type: 'tutorial',
    category: 'Editing',
    tags: ['editing', 'capcut', 'transitions'],
    difficulty: 'intermediate',
    duration: 45,
    views: 89000,
    likes: 5200,
    isPublished: true,
    featured: true
  },
  {
    title: 'Understanding the Algorithm',
    description: 'Deep dive into how TikTok\'s recommendation algorithm works and how to optimize your content for it.',
    type: 'best-practice',
    category: 'Growth',
    tags: ['algorithm', 'fyp', 'reach'],
    difficulty: 'intermediate',
    duration: 20,
    views: 156000,
    likes: 12000,
    isPublished: true,
    featured: true
  },
  {
    title: 'Lighting Setup for Beginners',
    description: 'Create professional-looking videos with affordable lighting setups. Ring lights, natural light, and more.',
    type: 'tutorial',
    category: 'Production',
    tags: ['lighting', 'setup', 'budget'],
    difficulty: 'beginner',
    duration: 12,
    views: 45000,
    likes: 3200,
    isPublished: true,
    featured: false
  },
  {
    title: 'Monetization Strategies',
    description: 'Learn how to make money on TikTok through Creator Fund, brand deals, live gifts, and affiliate marketing.',
    type: 'best-practice',
    category: 'Monetization',
    tags: ['money', 'brands', 'creator fund'],
    difficulty: 'advanced',
    duration: 30,
    views: 234000,
    likes: 18000,
    isPublished: true,
    featured: true
  },
  {
    title: 'Trending Sounds Guide',
    description: 'How to find and use trending sounds before they peak. Stay ahead of the trends.',
    type: 'tutorial',
    category: 'Content',
    tags: ['sounds', 'trending', 'music'],
    difficulty: 'beginner',
    duration: 10,
    views: 67000,
    likes: 4100,
    isPublished: true,
    featured: false
  },
  {
    title: 'Hook Your Audience in 3 Seconds',
    description: 'The first 3 seconds determine if viewers stay or scroll. Learn proven hook techniques.',
    type: 'best-practice',
    category: 'Content',
    tags: ['hooks', 'retention', 'engagement'],
    difficulty: 'beginner',
    duration: 8,
    views: 198000,
    likes: 15000,
    isPublished: true,
    featured: true
  },
  {
    title: 'Building Your Personal Brand',
    description: 'Create a consistent, memorable personal brand that attracts followers and opportunities.',
    type: 'case-study',
    category: 'Branding',
    tags: ['branding', 'niche', 'identity'],
    difficulty: 'intermediate',
    duration: 25,
    views: 78000,
    likes: 5600,
    isPublished: true,
    featured: false
  },
  {
    title: 'Collaboration Strategies',
    description: 'How to find and approach other creators for collaborations that grow both audiences.',
    type: 'best-practice',
    category: 'Growth',
    tags: ['collab', 'duets', 'networking'],
    difficulty: 'intermediate',
    duration: 18,
    views: 52000,
    likes: 3800,
    isPublished: true,
    featured: false
  },
  {
    title: 'Analytics Deep Dive',
    description: 'Understanding your TikTok analytics to make data-driven content decisions.',
    type: 'tutorial',
    category: 'Analytics',
    tags: ['analytics', 'data', 'insights'],
    difficulty: 'advanced',
    duration: 35,
    views: 41000,
    likes: 2900,
    isPublished: true,
    featured: false
  }
];

const sampleLearningPaths = [
  {
    name: 'TikTok Beginner Bootcamp',
    description: 'Everything you need to start your TikTok journey from zero to hero.',
    difficulty: 'beginner',
    estimatedDuration: 3,
    isPublished: true
  },
  {
    name: 'Advanced Growth Strategies',
    description: 'Take your TikTok game to the next level with advanced techniques.',
    difficulty: 'advanced',
    estimatedDuration: 5,
    isPublished: true
  }
];

async function seedCreatorAcademy() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await CreatorAcademy.deleteMany({});
    await LearningPath.deleteMany({});
    console.log('Cleared existing Creator Academy data');

    // Insert sample content
    const insertedContent = await CreatorAcademy.insertMany(sampleContent);
    console.log(`✅ Inserted ${insertedContent.length} Creator Academy items`);

    // Insert learning paths with course references
    for (const path of sampleLearningPaths) {
      const courses = insertedContent
        .filter(c => c.difficulty === path.difficulty || path.difficulty === 'beginner')
        .slice(0, 4)
        .map((c, i) => ({ course: c._id, order: i }));
      
      await LearningPath.create({ ...path, courses });
    }
    console.log(`✅ Inserted ${sampleLearningPaths.length} Learning Paths`);

    console.log('\n🎉 Creator Academy seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding Creator Academy:', error);
    process.exit(1);
  }
}

seedCreatorAcademy();

