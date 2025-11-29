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
    featured: true,
    content: `
      <h4>🚀 Introduction to Viral Content</h4>
      <p>Going viral on TikTok isn't just luck—it's a combination of strategy, timing, and understanding your audience. In this lesson, you'll learn the exact framework successful creators use.</p>
      
      <h4>📊 The Viral Formula</h4>
      <ul>
        <li><strong>Hook (0-3 seconds):</strong> Grab attention immediately with a bold statement, question, or visual</li>
        <li><strong>Value (3-30 seconds):</strong> Deliver your main content - entertainment, education, or emotion</li>
        <li><strong>Loop (Last 2 seconds):</strong> Create a seamless loop or call-to-action for rewatches</li>
      </ul>
      
      <h4>⏰ Best Posting Times</h4>
      <p>Based on data from millions of videos:</p>
      <ul>
        <li>Tuesday: 9 AM, 12 PM, 7 PM</li>
        <li>Thursday: 12 PM, 3 PM, 7 PM</li>
        <li>Friday: 5 AM, 1 PM, 3 PM</li>
        <li>Saturday: 11 AM, 7 PM, 8 PM</li>
      </ul>
      
      <h4>🎯 Key Takeaways</h4>
      <ol>
        <li>Post consistently (1-3 times daily)</li>
        <li>Use trending sounds within first 24 hours</li>
        <li>Engage with comments in first hour</li>
        <li>Create content in batches for efficiency</li>
      </ol>
    `
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
    featured: true,
    content: `
      <h4>🎬 Professional Editing Basics</h4>
      <p>Great editing can transform average footage into viral content. Learn the techniques top creators use daily.</p>
      
      <h4>✂️ Essential Cuts & Transitions</h4>
      <ul>
        <li><strong>Jump Cut:</strong> Remove pauses, keep energy high</li>
        <li><strong>J-Cut:</strong> Audio starts before video transition</li>
        <li><strong>L-Cut:</strong> Video changes but audio continues</li>
        <li><strong>Match Cut:</strong> Similar shapes/movements between clips</li>
      </ul>
      
      <h4>🛠️ CapCut Pro Tips</h4>
      <ol>
        <li>Use "Auto Captions" for accessibility (increases views by 40%)</li>
        <li>Apply "Velocity" for smooth slow-mo effects</li>
        <li>Layer multiple tracks for complex edits</li>
        <li>Use keyframes for custom animations</li>
      </ol>
      
      <h4>🎨 Color Grading</h4>
      <p>Consistent color grading builds brand recognition:</p>
      <ul>
        <li>Increase contrast slightly for punch</li>
        <li>Warm tones feel friendly and inviting</li>
        <li>Cool tones feel professional and calm</li>
        <li>Save your filter as a preset for consistency</li>
      </ul>
      
      <h4>💡 Export Settings</h4>
      <p>Always export at 1080x1920 (9:16), 30fps minimum, highest quality available.</p>
    `
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
    featured: true,
    content: `
      <h4>🧠 How TikTok's Algorithm Works</h4>
      <p>TikTok's algorithm is one of the most sophisticated recommendation systems. Understanding it is key to growth.</p>
      
      <h4>📈 The Ranking Signals</h4>
      <ul>
        <li><strong>Watch Time:</strong> #1 factor - videos watched to completion rank higher</li>
        <li><strong>Rewatches:</strong> Loops signal high-quality content</li>
        <li><strong>Shares:</strong> Strongest engagement signal</li>
        <li><strong>Comments:</strong> Especially early comments (first 30 min)</li>
        <li><strong>Likes:</strong> Important but less weight than above</li>
      </ul>
      
      <h4>🎯 The Testing Pool System</h4>
      <p>TikTok shows your video to small groups first:</p>
      <ol>
        <li><strong>Pool 1:</strong> 200-500 viewers (your followers + similar users)</li>
        <li><strong>Pool 2:</strong> 1,000-5,000 viewers (if Pool 1 performs well)</li>
        <li><strong>Pool 3:</strong> 10,000-100,000 viewers (potential viral territory)</li>
        <li><strong>Pool 4:</strong> 100,000+ (viral status achieved)</li>
      </ol>
      
      <h4>⚠️ Algorithm Mistakes to Avoid</h4>
      <ul>
        <li>Deleting and re-uploading (resets performance)</li>
        <li>Hashtag stuffing (use 3-5 relevant ones)</li>
        <li>Posting inconsistently (kills momentum)</li>
        <li>Ignoring analytics (data shows what works)</li>
      </ul>
    `
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
    featured: false,
    content: `
      <h4>💡 Lighting Fundamentals</h4>
      <p>Good lighting is the #1 difference between amateur and professional-looking content. You don't need expensive gear!</p>
      
      <h4>☀️ Natural Light (FREE)</h4>
      <ul>
        <li>Face a window for soft, flattering light</li>
        <li>Best times: Golden hour (sunrise/sunset) or overcast days</li>
        <li>Avoid harsh midday sun (creates shadows)</li>
        <li>Use white sheets as diffusers if too bright</li>
      </ul>
      
      <h4>💫 Ring Light Setup ($20-50)</h4>
      <ol>
        <li>Position ring light directly in front of your face</li>
        <li>Place camera in the center of the ring</li>
        <li>Keep light at eye level or slightly above</li>
        <li>Use warm setting (3000-4000K) for cozy vibes</li>
        <li>Use cool setting (5000-6000K) for energetic content</li>
      </ol>
      
      <h4>🎥 Three-Point Lighting (Pro Setup)</h4>
      <ul>
        <li><strong>Key Light:</strong> Main light, 45° angle from camera</li>
        <li><strong>Fill Light:</strong> Softer light opposite key, reduces shadows</li>
        <li><strong>Back Light:</strong> Behind subject, creates depth/separation</li>
      </ul>
      
      <h4>📱 Phone Settings</h4>
      <p>Lock exposure and white balance before recording to maintain consistency!</p>
    `
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
    featured: true,
    content: `
      <h4>💰 TikTok Monetization Overview</h4>
      <p>There are multiple ways to earn money on TikTok. Top creators combine several methods.</p>
      
      <h4>📊 Creator Fund & Creativity Program</h4>
      <ul>
        <li>Requirements: 10K followers, 100K views in 30 days</li>
        <li>Earnings: $0.02-0.04 per 1,000 views (varies)</li>
        <li>Creativity Program Beta: Up to 20x higher payouts for 1min+ videos</li>
      </ul>
      
      <h4>🤝 Brand Deals (Highest Earning Potential)</h4>
      <table style="width:100%; border-collapse: collapse; margin: 10px 0;">
        <tr style="background:#f0f0f0;"><th style="padding:8px; text-align:left;">Followers</th><th style="padding:8px;">Rate Per Post</th></tr>
        <tr><td style="padding:8px;">10K-50K</td><td style="padding:8px;">$200-500</td></tr>
        <tr><td style="padding:8px;">50K-100K</td><td style="padding:8px;">$500-2,000</td></tr>
        <tr><td style="padding:8px;">100K-500K</td><td style="padding:8px;">$2,000-10,000</td></tr>
        <tr><td style="padding:8px;">500K-1M</td><td style="padding:8px;">$10,000-25,000</td></tr>
        <tr><td style="padding:8px;">1M+</td><td style="padding:8px;">$25,000-100,000+</td></tr>
      </table>
      
      <h4>🎁 LIVE Gifts</h4>
      <ul>
        <li>Requirements: 1K followers, 18+ years old</li>
        <li>Viewers send virtual gifts (convert to real money)</li>
        <li>Top earners: $1,000-10,000+ per LIVE session</li>
      </ul>
      
      <h4>🔗 Affiliate Marketing</h4>
      <p>Promote products and earn commission (5-50% per sale). Use TikTok Shop or link in bio.</p>
    `
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
    featured: false,
    content: `
      <h4>🎵 Why Trending Sounds Matter</h4>
      <p>Using trending sounds can increase your reach by 50-300%. The algorithm favors content with popular audio.</p>
      
      <h4>🔍 How to Find Trending Sounds</h4>
      <ol>
        <li><strong>For You Page:</strong> Save sounds from viral videos you see</li>
        <li><strong>Sound Library:</strong> Check "TikTok Viral" playlist</li>
        <li><strong>Creative Center:</strong> analytics.tiktok.com shows trending sounds</li>
        <li><strong>Reels:</strong> Sounds trending on Instagram often come to TikTok</li>
      </ol>
      
      <h4>⏱️ Timing Is Everything</h4>
      <ul>
        <li><strong>Early Stage (Day 1-3):</strong> Best time to use - less competition</li>
        <li><strong>Peak (Day 4-7):</strong> High competition but high search volume</li>
        <li><strong>Decline (Day 8+):</strong> Avoid - algorithm stops pushing</li>
      </ul>
      
      <h4>🎯 Sound Strategy Tips</h4>
      <ul>
        <li>Save 10-15 sounds weekly to your favorites</li>
        <li>Put your own twist on trending formats</li>
        <li>Original sounds can go viral too (create your own!)</li>
        <li>Match sound energy to your content style</li>
      </ul>
      
      <h4>⚠️ Copyright Warning</h4>
      <p>Some sounds are region-locked or have commercial restrictions. Check before using for sponsored content.</p>
    `
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
    featured: true,
    content: `
      <h4>⚡ The 3-Second Rule</h4>
      <p>You have exactly 3 seconds to convince viewers to stay. Miss this window and they're gone forever.</p>
      
      <h4>🎣 10 Proven Hook Types</h4>
      <ol>
        <li><strong>"Stop scrolling if..."</strong> - Direct command</li>
        <li><strong>"Nobody talks about..."</strong> - Curiosity gap</li>
        <li><strong>"I was today years old when..."</strong> - Revelation</li>
        <li><strong>"POV:"</strong> - Immersive storytelling</li>
        <li><strong>"The reason why... is..."</strong> - Explanation</li>
        <li><strong>"Watch until the end..."</strong> - Promise payoff</li>
        <li><strong>"Things that just make sense..."</strong> - Relatable</li>
        <li><strong>"Unpopular opinion:"</strong> - Controversy</li>
        <li><strong>"If you're seeing this..."</strong> - Personal connection</li>
        <li><strong>Action/Movement</strong> - Visual hook (no words needed)</li>
      </ol>
      
      <h4>📊 Hook Performance Metrics</h4>
      <ul>
        <li>Strong hook = 60%+ watch through rate</li>
        <li>Weak hook = Under 30% watch through rate</li>
        <li>Check your analytics to see average watch time</li>
      </ul>
      
      <h4>✅ Quick Checklist</h4>
      <ul>
        <li>First frame is visually interesting</li>
        <li>Text appears immediately</li>
        <li>Face is visible (if applicable)</li>
        <li>Audio starts with energy</li>
      </ul>
    `
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
    featured: false,
    content: `
      <h4>🎨 What Is Personal Branding?</h4>
      <p>Your personal brand is how people remember and recognize you. It's your unique combination of personality, expertise, and visual style.</p>
      
      <h4>🎯 Finding Your Niche</h4>
      <p>Answer these questions:</p>
      <ol>
        <li>What could you talk about for hours?</li>
        <li>What do people always ask you about?</li>
        <li>What's unique about your perspective?</li>
        <li>Who is your ideal viewer?</li>
      </ol>
      
      <h4>📋 Brand Elements Checklist</h4>
      <ul>
        <li><strong>Username:</strong> Memorable, easy to spell, consistent across platforms</li>
        <li><strong>Profile Picture:</strong> Clear face or recognizable logo</li>
        <li><strong>Bio:</strong> What you do + Why follow you + CTA</li>
        <li><strong>Color Palette:</strong> 2-3 consistent colors in thumbnails</li>
        <li><strong>Font Style:</strong> Same text style in all videos</li>
        <li><strong>Catchphrase:</strong> Signature intro or outro</li>
      </ul>
      
      <h4>📈 Case Study: Khaby Lame</h4>
      <ul>
        <li>Niche: Silent comedy reactions</li>
        <li>Brand: Signature hand gesture + expressions</li>
        <li>Result: 160M+ followers, no speaking required</li>
        <li>Lesson: Simplicity and consistency wins</li>
      </ul>
      
      <h4>💡 Pro Tip</h4>
      <p>Post 30 videos before judging what works. Your brand will evolve naturally as you find your voice.</p>
    `
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
    featured: false,
    content: `
      <h4>🤝 Why Collaborations Work</h4>
      <p>Collabs expose you to new audiences. A single good collab can bring more followers than weeks of solo content.</p>
      
      <h4>🎯 Types of TikTok Collaborations</h4>
      <ul>
        <li><strong>Duets:</strong> React to or add to someone's video</li>
        <li><strong>Stitches:</strong> Use a clip to start your own video</li>
        <li><strong>Joint Videos:</strong> Create content together (in person or remote)</li>
        <li><strong>Challenges:</strong> Start a trend others can join</li>
        <li><strong>Shoutouts:</strong> Mutual promotion in videos</li>
      </ul>
      
      <h4>📧 How to Reach Out</h4>
      <p>DM Template that works:</p>
      <div style="background:#f5f5f5; padding:15px; border-radius:8px; margin:10px 0;">
        <p>"Hey [Name]! Love your content, especially [specific video]. I create [your niche] content and think our audiences would love a collab about [idea]. Would you be interested? No pressure either way!"</p>
      </div>
      
      <h4>✅ Collab Partner Criteria</h4>
      <ul>
        <li>Similar follower count (0.5x to 2x your size)</li>
        <li>Complementary niche (not identical)</li>
        <li>Similar content quality</li>
        <li>Engaged audience (check their comments)</li>
      </ul>
      
      <h4>⚠️ Red Flags to Avoid</h4>
      <ul>
        <li>Asking for payment for a "shoutout"</li>
        <li>Fake follower counts (check engagement rate)</li>
        <li>Mismatched values or controversial history</li>
      </ul>
    `
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
    featured: false,
    content: `
      <h4>📊 TikTok Analytics Overview</h4>
      <p>Data is your secret weapon. Top creators check analytics daily and adjust strategy accordingly.</p>
      
      <h4>🔑 Key Metrics to Track</h4>
      <table style="width:100%; border-collapse: collapse; margin: 10px 0;">
        <tr style="background:#f0f0f0;"><th style="padding:8px; text-align:left;">Metric</th><th style="padding:8px;">What It Means</th><th style="padding:8px;">Target</th></tr>
        <tr><td style="padding:8px;">Watch Time</td><td style="padding:8px;">Avg % of video watched</td><td style="padding:8px;">60%+</td></tr>
        <tr><td style="padding:8px;">Engagement Rate</td><td style="padding:8px;">(Likes+Comments+Shares)/Views</td><td style="padding:8px;">5-10%</td></tr>
        <tr><td style="padding:8px;">Share Rate</td><td style="padding:8px;">Shares per view</td><td style="padding:8px;">1%+</td></tr>
        <tr><td style="padding:8px;">Profile Views</td><td style="padding:8px;">How many checked your profile</td><td style="padding:8px;">Track trend</td></tr>
        <tr><td style="padding:8px;">Follower Growth</td><td style="padding:8px;">New followers per day</td><td style="padding:8px;">Consistent up</td></tr>
      </table>
      
      <h4>📈 Understanding Traffic Sources</h4>
      <ul>
        <li><strong>For You Page:</strong> Algorithm pushing your content (best source)</li>
        <li><strong>Following:</strong> Your existing followers</li>
        <li><strong>Sound Page:</strong> From trending sound</li>
        <li><strong>Search:</strong> SEO is working</li>
        <li><strong>Profile:</strong> Direct visitors</li>
      </ul>
      
      <h4>🎯 Audience Insights</h4>
      <ul>
        <li>Check when your audience is most active</li>
        <li>Note top countries/regions</li>
        <li>Analyze age and gender breakdown</li>
        <li>Create content for YOUR specific audience</li>
      </ul>
      
      <h4>📋 Weekly Analytics Review</h4>
      <ol>
        <li>Top 3 performing videos - what do they have in common?</li>
        <li>Bottom 3 videos - what can you learn?</li>
        <li>Best posting time based on data</li>
        <li>Follower growth rate changes</li>
      </ol>
    `
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
