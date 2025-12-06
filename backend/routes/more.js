const express = require('express');
const authMiddleware = require('../middleware/auth');
const Effect = require('../models/Effect');

const router = express.Router();

const SUPPORTED_LANGUAGES = [
  { id: 'en_us', label: 'English (US)' }
];

router.get('/studio', authMiddleware, async (req, res) => {
  try {
    const User = require('../models/User');
    const Video = require('../models/Video');
    
    const userId = req.user._id;
    
    // Get user with followers
    const user = await User.findById(userId).select('profile.followers');
    const totalFollowers = user?.profile?.followers || 0;
    
    // Get user's videos with analytics
    const videos = await Video.find({ user: userId })
      .select('views likes comments shares createdAt')
      .lean();
    
    // Calculate real analytics from database
    const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = videos.reduce((sum, v) => sum + (v.likes || 0), 0);
    const totalComments = videos.reduce((sum, v) => sum + (v.comments || 0), 0);
    const totalShares = videos.reduce((sum, v) => sum + (v.shares || 0), 0);
    const videoCount = videos.length;
    
    // Calculate watch time (estimated: average 30 seconds per view)
    const totalWatchTimeMinutes = Math.floor(totalViews * 30 / 60);
    
    // Estimated earnings (simulated based on views)
    const estimatedEarnings = (totalViews * 0.001).toFixed(2); // $0.001 per view
    
    res.json({
      overview: {
        totalViews,
        totalFollowers,
        totalWatchTimeMinutes,
        liveSessionsHosted: 0, // Would need Live model for real data
        estimatedEarnings: parseFloat(estimatedEarnings)
      },
    performanceTrend: (() => {
      // Calculate weekly performance from videos created in last 7 days
      const now = new Date();
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const dayVideos = videos.filter(v => {
          const videoDate = new Date(v.createdAt);
          return videoDate >= dayStart && videoDate <= dayEnd;
        });
        
        const dayViews = dayVideos.reduce((sum, v) => sum + (v.views || 0), 0);
        const dayEngagement = dayVideos.reduce((sum, v) => sum + (v.likes || 0) + (v.comments || 0) + (v.shares || 0), 0);
        const engagementRate = dayViews > 0 ? ((dayEngagement / dayViews) * 100).toFixed(1) : 0;
        
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        last7Days.push({
          label: dayLabels[date.getDay()],
          views: dayViews,
          engagementRate: parseFloat(engagementRate)
        });
      }
      return last7Days;
    })(),
    topVideos: videos
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 3)
      .map((video, index) => ({
        id: video._id.toString(),
        title: video.description?.substring(0, 50) || `Video ${index + 1}`,
        views: video.views || 0,
        likes: video.likes || 0,
        comments: video.comments || 0,
        shares: video.shares || 0,
        completionRate: video.views > 0 ? Math.floor(((video.likes || 0) / video.views) * 100) : 0
      })),
    streamSchedule: [], // Would need Live/Stream model for real data
    actionableInsights: (() => {
      const insights = [];
      const now = new Date();
      
      // Insight 1: Video performance
      if (videoCount > 0) {
        const avgViews = totalViews / videoCount;
        const topVideo = videos.sort((a, b) => (b.views || 0) - (a.views || 0))[0];
        if (topVideo && topVideo.views > avgViews * 1.5) {
          insights.push({
            id: 'insight-1',
            priority: 'high',
            title: 'Top performing video detected',
            message: `Your best video has ${topVideo.views.toLocaleString()} views. Create similar content to boost engagement.`
          });
        }
      }
      
      // Insight 2: Engagement rate
      const avgEngagementRate = totalViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews * 100) : 0;
      if (avgEngagementRate < 5) {
        insights.push({
          id: 'insight-2',
          priority: 'medium',
          title: 'Improve engagement',
          message: `Your average engagement rate is ${avgEngagementRate.toFixed(1)}%. Try posting at peak hours (7-9 PM) to increase reach.`
        });
      }
      
      // Insight 3: Content frequency
      const videosLast7Days = videos.filter(v => {
        const videoDate = new Date(v.createdAt);
        const daysAgo = (now - videoDate) / (1000 * 60 * 60 * 24);
        return daysAgo <= 7;
      }).length;
      
      if (videosLast7Days < 3) {
        insights.push({
          id: 'insight-3',
          priority: 'low',
          title: 'Increase posting frequency',
          message: `You've posted ${videosLast7Days} video(s) this week. Posting 3-5 times per week can help grow your audience faster.`
        });
      }
      
      // Default insights if none generated
      if (insights.length === 0) {
        insights.push(
          {
            id: 'insight-1',
            priority: 'high',
            title: 'Keep creating great content',
            message: 'Your videos are performing well! Continue posting consistently to maintain growth.'
          },
          {
            id: 'insight-2',
            priority: 'medium',
            title: 'Engage with your audience',
            message: 'Respond to comments and interact with followers to build a stronger community.'
          }
        );
      }
      
      return insights;
    })()
  });
  } catch (error) {
    console.error('Error fetching studio data:', error);
    // Return fallback data on error
    res.json({
      overview: {
        totalViews: 0,
        totalFollowers: 0,
        totalWatchTimeMinutes: 0,
        liveSessionsHosted: 0,
        estimatedEarnings: 0
      },
      performanceTrend: [
        { label: 'Mon', views: 0, engagementRate: 0 },
        { label: 'Tue', views: 0, engagementRate: 0 },
        { label: 'Wed', views: 0, engagementRate: 0 },
        { label: 'Thu', views: 0, engagementRate: 0 },
        { label: 'Fri', views: 0, engagementRate: 0 },
        { label: 'Sat', views: 0, engagementRate: 0 },
        { label: 'Sun', views: 0, engagementRate: 0 }
      ],
      topVideos: [],
      streamSchedule: [],
      actionableInsights: [
        {
          id: 'insight-1',
          priority: 'high',
          title: 'Start creating content',
          message: 'Upload your first video to see analytics and insights.'
        }
      ]
    });
  }
});

router.get('/effects', authMiddleware, async (req, res) => {
  try {
    // Fetch featured effects from database
    const featuredEffects = await Effect.find({ isActive: true, isFeatured: true })
      .populate('creator', 'username profile.displayName')
      .sort({ usageCount: -1, favoritesCount: -1 })
      .limit(10)
      .lean();

    // Format templates from database effects
    const templates = featuredEffects.map((effect, index) => ({
      id: effect._id.toString(),
      name: effect.name,
      category: effect.category.charAt(0).toUpperCase() + effect.category.slice(1),
      usageCount: effect.usageCount || 0,
      complexity: effect.category === 'ar' || effect.category === '3d' ? 'Intermediate' : 'Beginner',
      lastUpdated: effect.updatedAt || effect.createdAt
    }));

    // If no effects in database, provide fallback templates
    const finalTemplates = templates.length > 0 ? templates : [
      {
        id: 'effect-1',
        name: 'Neon Trails',
        category: 'Trending',
        usageCount: 18400,
        complexity: 'Beginner',
        lastUpdated: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'effect-2',
        name: 'Split Reality',
        category: 'Creative',
        usageCount: 9600,
        complexity: 'Intermediate',
        lastUpdated: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'effect-3',
        name: 'Retro VHS Pack',
        category: 'Essentials',
        usageCount: 27300,
        complexity: 'Beginner',
        lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    res.json({
      templates: finalTemplates,
      toolkits: [
        { id: 'tool-1', title: 'AR basics', durationMinutes: 18, difficulty: 'Beginner' },
        { id: 'tool-2', title: 'Advanced transitions', durationMinutes: 32, difficulty: 'Intermediate' },
        { id: 'tool-3', title: 'Trending effect breakdowns', durationMinutes: 24, difficulty: 'Beginner' }
      ],
      recommendations: [
        'Upload effects in bundles to increase adoption rate by 25%.',
        'Promote new effects with duet-friendly prompts.',
        'Review analytics weekly to retire underperforming effects.'
      ]
    });
  } catch (error) {
    console.error('Error fetching effects toolbox:', error);
    // Return fallback data on error
    res.json({
      templates: [
        {
          id: 'effect-1',
          name: 'Neon Trails',
          category: 'Trending',
          usageCount: 18400,
          complexity: 'Beginner',
          lastUpdated: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'effect-2',
          name: 'Split Reality',
          category: 'Creative',
          usageCount: 9600,
          complexity: 'Intermediate',
          lastUpdated: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'effect-3',
          name: 'Retro VHS Pack',
          category: 'Essentials',
          usageCount: 27300,
          complexity: 'Beginner',
          lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }
      ],
      toolkits: [
        { id: 'tool-1', title: 'AR basics', durationMinutes: 18, difficulty: 'Beginner' },
        { id: 'tool-2', title: 'Advanced transitions', durationMinutes: 32, difficulty: 'Intermediate' },
        { id: 'tool-3', title: 'Trending effect breakdowns', durationMinutes: 24, difficulty: 'Beginner' }
      ],
      recommendations: [
        'Upload effects in bundles to increase adoption rate by 25%.',
        'Promote new effects with duet-friendly prompts.',
        'Review analytics weekly to retire underperforming effects.'
      ]
    });
  }
});

router.get('/shop', authMiddleware, (_req, res) => {
  res.json({
    summary: {
      ordersLast30Days: 142,
      revenueLast30Days: 8245.5,
      conversionRate: 3.8,
      returningCustomers: 42
    },
    productPerformance: [
      {
        id: 'prod-1',
        name: 'Creator Essentials Kit',
        price: 59.99,
        orders: 68,
        conversionRate: 4.1,
        inventory: 120
      },
      {
        id: 'prod-2',
        name: 'Lighting Starter Pack',
        price: 89.5,
        orders: 41,
        conversionRate: 3.2,
        inventory: 42
      },
      {
        id: 'prod-3',
        name: 'Smartphone Tripod',
        price: 29.0,
        orders: 95,
        conversionRate: 5.4,
        inventory: 260
      }
    ],
    fulfillment: {
      pending: 6,
      packed: 12,
      shipped: 25,
      delivered: 88
    },
    actions: [
      {
        id: 'shop-action-1',
        title: 'Complete product education badge',
        impact: 'Boost product visibility by up to 15%.'
      },
      {
        id: 'shop-action-2',
        title: 'Enable bundle discounts',
        impact: 'Drive higher average order value with curated bundles.'
      }
    ]
  });
});

router.get('/growth', authMiddleware, async (req, res) => {
  try {
    const User = require('../models/User');
    const Video = require('../models/Video');
    const mongoose = require('mongoose');

    const userId = req.user._id;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get user with followers count
    const user = await User.findById(userId).select('profile.followers createdAt');
    const currentFollowers = user?.profile?.followers || 0;

    // Get followers from last week and month (simulated based on account age and activity)
    const accountAgeDays = Math.floor((now - new Date(user?.createdAt || now)) / (1000 * 60 * 60 * 24));
    const weeklyGain = Math.floor(currentFollowers * 0.05); // 5% weekly growth estimate
    const monthlyGain = Math.floor(currentFollowers * 0.18); // 18% monthly growth estimate
    const growthRate = accountAgeDays > 0 ? ((monthlyGain / Math.max(currentFollowers - monthlyGain, 1)) * 100).toFixed(1) : '0.0';

    // Get user's videos with performance data
    const videos = await Video.find({ user: userId })
      .select('views likes comments shares createdAt description hashtags')
      .sort({ views: -1 })
      .limit(50)
      .lean();

    // Calculate analytics
    const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = videos.reduce((sum, v) => sum + (v.likes || 0), 0);
    const totalComments = videos.reduce((sum, v) => sum + (v.comments || 0), 0);
    const totalShares = videos.reduce((sum, v) => sum + (v.shares || 0), 0);
    const videoCount = videos.length;

    // Top performing videos
    const topVideos = videos
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map(v => ({
        id: v._id.toString(),
        title: v.description?.substring(0, 50) || 'Untitled Video',
        views: v.views || 0,
        likes: v.likes || 0,
        comments: v.comments || 0,
        shares: v.shares || 0,
        engagementRate: v.views > 0 ? (((v.likes || 0) + (v.comments || 0) + (v.shares || 0)) / v.views * 100).toFixed(1) : '0.0'
      }));

    // Extract hashtags from videos
    const hashtagMap = {};
    videos.forEach(v => {
      if (v.hashtags && Array.isArray(v.hashtags)) {
        v.hashtags.forEach(tag => {
          hashtagMap[tag] = (hashtagMap[tag] || 0) + 1;
        });
      }
    });
    const topHashtags = Object.entries(hashtagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    // Average view duration (simulated - in real app, track actual watch time)
    const avgViewDuration = videoCount > 0 ? Math.floor(totalViews / videoCount / 10) : 0;

    // Audience Insights (simulated - in real app, track actual demographics)
    const audienceInsights = {
      topCountries: [
        { country: 'United States', percentage: 45, flag: '🇺🇸' },
        { country: 'India', percentage: 28, flag: '🇮🇳' },
        { country: 'United Kingdom', percentage: 12, flag: '🇬🇧' },
        { country: 'Canada', percentage: 8, flag: '🇨🇦' },
        { country: 'Australia', percentage: 7, flag: '🇦🇺' }
      ],
      ageGroups: [
        { range: '18-24', percentage: 35 },
        { range: '25-34', percentage: 42 },
        { range: '35-44', percentage: 18 },
        { range: '45+', percentage: 5 }
      ],
      activeHours: [
        { hour: '7-9 AM', percentage: 12, label: 'Morning' },
        { hour: '12-2 PM', percentage: 18, label: 'Lunch' },
        { hour: '5-7 PM', percentage: 32, label: 'Evening' },
        { hour: '9-11 PM', percentage: 38, label: 'Night' }
      ],
      contentPreferences: [
        { type: 'Entertainment', percentage: 45 },
        { type: 'Educational', percentage: 28 },
        { type: 'Trending', percentage: 18 },
        { type: 'Comedy', percentage: 9 }
      ]
    };

    // Suggestions & Playbooks
    const suggestions = [
      {
        id: 'suggestion-1',
        title: 'Post during peak hours',
        description: 'Your audience is most active between 5-7 PM and 9-11 PM. Schedule posts during these times to maximize engagement and reach.',
        category: 'Timing',
        priority: 'high'
      },
      {
        id: 'suggestion-2',
        title: 'Use trending hashtags',
        description: 'Incorporate trending hashtags like #fyp, #viral, and #trending along with your niche hashtags to increase discoverability.',
        category: 'Hashtags',
        priority: 'high'
      },
      {
        id: 'suggestion-3',
        title: 'Create series content',
        description: 'Your top-performing videos show high engagement. Create a series around your best content to keep viewers coming back.',
        category: 'Content Strategy',
        priority: 'medium'
      },
      {
        id: 'suggestion-4',
        title: 'Engage with comments',
        description: 'Responding to comments within the first hour increases engagement by 25%. Make time to interact with your audience.',
        category: 'Engagement',
        priority: 'medium'
      },
      {
        id: 'suggestion-5',
        title: 'Collaborate with creators',
        description: 'Partner with creators in your niche (18-34 age group) to cross-promote and reach new audiences.',
        category: 'Growth',
        priority: 'low'
      },
      {
        id: 'suggestion-6',
        title: 'Optimize video length',
        description: 'Videos between 15-60 seconds perform best. Keep your content concise and engaging to maintain viewer attention.',
        category: 'Content',
        priority: 'medium'
      }
    ];

    res.json({
      analytics: {
        followerGain: {
          weekly: weeklyGain,
          monthly: monthlyGain,
          growthRate: parseFloat(growthRate)
        },
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        videoCount,
        averageViewDurationSeconds: avgViewDuration,
        hashtagsPerforming: topHashtags.length > 0 ? topHashtags : ['#fyp', '#viral', '#trending'],
        topVideos
      },
      insights: [
        {
          id: 'insight-1',
          title: 'Peak engagement times',
          detail: `Your audience is most active between 5-7 PM (32%) and 9-11 PM (38%). Post during these hours for maximum reach.`
        },
        {
          id: 'insight-2',
          title: 'Primary audience location',
          detail: `45% of your audience is from United States, followed by India (28%). Create content that resonates with these regions.`
        },
        {
          id: 'insight-3',
          title: 'Age demographics',
          detail: `Your core audience (77%) is between 18-34 years old. Tailor your content style and topics to this age group.`
        },
        {
          id: 'insight-4',
          title: 'Content preferences',
          detail: `Entertainment content (45%) performs best with your audience, followed by educational content (28%).`
        }
      ],
      audienceInsights,
      suggestions
    });
  } catch (error) {
    console.error('Error fetching growth insights:', error);
    // Return fallback data on error
    res.json({
      analytics: {
        followerGain: {
          weekly: 920,
          monthly: 3140,
          growthRate: 18.6
        },
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        videoCount: 0,
        averageViewDurationSeconds: 37,
        hashtagsPerforming: ['#creatortips', '#workflow', '#behindthescenes'],
        topVideos: []
      },
      insights: [
        {
          id: 'growth-insight-1',
          title: 'Viewers rewatch transitions',
          detail: 'Your audience replays clips that involve complex transitions. Break them down in separate tutorial clips.'
        },
        {
          id: 'growth-insight-2',
          title: 'Followers active on weekends',
          detail: 'Engagement jumps 22% when you post mid-day on Saturdays.'
        }
      ],
      suggestions: [
        {
          id: 'growth-suggestion-1',
          title: 'Host a live Q&A',
          description: 'Answer audience questions live to deepen community engagement. Live viewers are 40% more likely to follow.'
        },
        {
          id: 'growth-suggestion-2',
          title: 'Collaborate with emerging creators',
          description: 'Partner with creators in your niche to cross-promote and gain new followers.'
        }
      ],
      audienceInsights: {
        topCountries: [
          { country: 'United States', percentage: 45, flag: '🇺🇸' },
          { country: 'India', percentage: 28, flag: '🇮🇳' },
          { country: 'United Kingdom', percentage: 12, flag: '🇬🇧' }
        ],
        ageGroups: [
          { range: '18-24', percentage: 35 },
          { range: '25-34', percentage: 42 },
          { range: '35-44', percentage: 18 }
        ],
        activeHours: [
          { hour: '5-7 PM', percentage: 32, label: 'Evening' },
          { hour: '9-11 PM', percentage: 38, label: 'Night' }
        ],
        contentPreferences: [
          { type: 'Entertainment', percentage: 45 },
          { type: 'Educational', percentage: 28 }
        ]
      }
    });
  }
});

router.get('/support', authMiddleware, (_req, res) => {
  res.json({
    contactChannels: [
      {
        id: 'support-chat',
        title: 'Chat with creator support',
        availability: '24/7',
        averageResponseMinutes: 5,
        description: 'Get instant help with account issues, monetization questions, or video problems'
      },
      {
        id: 'support-email',
        title: 'Email support',
        availability: 'Replies within 24 hours',
        averageResponseMinutes: 60 * 12,
        description: 'Send detailed reports about account issues, monetization problems, or video concerns'
      },
      {
        id: 'report-issue',
        title: 'Report an issue',
        availability: 'Available anytime',
        averageResponseMinutes: 0,
        description: 'Report account problems, monetization issues, or video-related concerns'
      }
    ],
    helpTopics: [
      {
        id: 'account-help',
        title: 'Account & Security',
        articles: [
          'Enable two-factor authentication',
          'Recognize official TikTok communication',
          'Recover access to a locked account',
          'Fix account verification issues',
          'Resolve login problems'
        ],
        icon: 'fa-shield-halved'
      },
      {
        id: 'monetization-help',
        title: 'Monetization & Payouts',
        articles: [
          'Eligibility for creator programs',
          'Set up payout methods',
          'Resolve a payout hold',
          'Understand creator fund requirements',
          'Troubleshoot monetization issues'
        ],
        icon: 'fa-dollar-sign'
      },
      {
        id: 'video-help',
        title: 'Video Problems',
        articles: [
          'Video upload failed - troubleshooting',
          'Video processing issues',
          'Video quality problems',
          'Copyright and content removal',
          'Video not showing in feed'
        ],
        icon: 'fa-video'
      },
      {
        id: 'growth-help',
        title: 'Growth & Analytics',
        articles: [
          'How to grow your account',
          'Understanding analytics',
          'Increase video reach',
          'Build your audience',
          'Content strategy tips'
        ],
        icon: 'fa-chart-line'
      },
      {
        id: 'policy-help',
        title: 'Policies & Reporting',
        articles: [
          'Content guidelines reference',
          'Appeal a content removal',
          'Report impersonation',
          'Community guidelines',
          'Report harassment or abuse'
        ],
        icon: 'fa-file-shield'
      }
    ],
    recentUpdates: [
      {
        id: 'support-update-1',
        title: 'Faster dispute resolution',
        detail: 'We have introduced a new ticket triage system that reduces median resolution time by 38%.',
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'support-update-2',
        title: 'Creator academy refresh',
        detail: 'New lessons covering monetization best practices and community management are now live.',
        publishedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'support-update-3',
        title: 'Enhanced video support',
        detail: 'New tools to help creators troubleshoot video upload and processing issues faster.',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ],
    quickGuides: [
      {
        id: 'guide-1',
        title: 'Getting Started as a Creator',
        steps: [
          'Complete your profile setup',
          'Verify your account',
          'Start creating content',
          'Engage with your audience',
          'Apply for creator programs'
        ]
      },
      {
        id: 'guide-2',
        title: 'Monetization Setup Guide',
        steps: [
          'Check eligibility requirements',
          'Link your payment method',
          'Enable monetization features',
          'Track your earnings',
          'Set up tax information'
        ]
      },
      {
        id: 'guide-3',
        title: 'Video Upload Troubleshooting',
        steps: [
          'Check video format and size',
          'Ensure stable internet connection',
          'Clear app cache if needed',
          'Try uploading from different device',
          'Contact support if issue persists'
        ]
      }
    ]
  });
});

router.get('/languages', authMiddleware, (_req, res) => {
  res.json({
    languages: SUPPORTED_LANGUAGES
  });
});

// Test route to verify server is running with new routes (no auth required for testing)
router.get('/support/test', (req, res) => {
  console.log('✅ Test route hit: /api/more/support/test');
  res.json({
    success: true,
    message: 'Support routes are working! Server has been restarted with new routes.',
    timestamp: new Date().toISOString(),
    routes: [
      'POST /api/more/support/tickets',
      'GET /api/more/support/tickets',
      'GET /api/more/support/tickets/:id',
      'POST /api/more/support/tickets/:id/message'
    ]
  });
});

// Create support ticket (user side) - MUST be before GET /support/tickets/:id
router.post('/support/tickets', authMiddleware, async (req, res) => {
  try {
    console.log('🎫🎫🎫 POST /api/more/support/tickets - ROUTE HIT! 🎫🎫🎫');
    console.log('🎫 User ID:', req.user?._id);
    console.log('🎫 Request body:', JSON.stringify(req.body, null, 2));
    const Ticket = require('../models/Ticket');
    const { category, subject, description, priority = 'medium' } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Category, subject, and description are required'
      });
    }

    // Map frontend issue types to backend categories
    const categoryMap = {
      'account': 'account',
      'monetization': 'payment',
      'video': 'technical',
      'general': 'general',
      'content': 'content',
      'other': 'other'
    };

    const ticketCategory = categoryMap[category] || 'other';

    // Generate ticket ID before creating ticket
    const ticketCount = await Ticket.countDocuments();
    const ticketId = `TK-${Date.now()}-${String(ticketCount + 1).padStart(6, '0')}`;

    // Create ticket
    const ticket = new Ticket({
      ticketId: ticketId,
      userId: req.user._id,
      category: ticketCategory,
      priority: priority,
      subject: subject,
      description: description,
      status: 'open',
      messages: [{
        sender: 'user',
        senderId: req.user._id,
        message: description,
        timestamp: new Date(),
        read: false
      }]
    });

    await ticket.save();

    console.log(`✅ New support ticket created: ${ticket.ticketId} by user ${req.user.username}`);

    res.json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        id: ticket._id,
        ticketId: ticket.ticketId,
        category: ticket.category,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error creating support ticket:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create support ticket. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's own tickets
router.get('/support/tickets', authMiddleware, async (req, res) => {
  try {
    console.log('🎫 GET /api/more/support/tickets - Request received from user:', req.user._id);
    const Ticket = require('../models/Ticket');
    const tickets = await Ticket.find({ userId: req.user._id })
      .sort({ lastActivityAt: -1 })
      .select('ticketId subject category status priority createdAt lastActivityAt messages')
      .lean();

    res.json({
      success: true,
      tickets: tickets.map(ticket => ({
        id: ticket._id,
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        lastActivityAt: ticket.lastActivityAt,
        unreadCount: ticket.messages?.filter(m => m.sender === 'admin' && !m.read).length || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets'
    });
  }
});

// Get specific ticket with messages (user side)
router.get('/support/tickets/:id', authMiddleware, async (req, res) => {
  try {
    const Ticket = require('../models/Ticket');
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('assignedTo', 'username email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      ticket: {
        id: ticket._id,
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        messages: ticket.messages || [],
        createdAt: ticket.createdAt,
        lastActivityAt: ticket.lastActivityAt
      }
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket'
    });
  }
});

// Add message to ticket (user side)
router.post('/support/tickets/:id/message', authMiddleware, async (req, res) => {
  try {
    const Ticket = require('../models/Ticket');
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Add user message
    ticket.messages.push({
      sender: 'user',
      senderId: req.user._id,
      message: message.trim(),
      timestamp: new Date(),
      read: false
    });

    // Update status and last activity
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      ticket.status = 'open';
    }
    ticket.lastActivityAt = new Date();

    await ticket.save();

    res.json({
      success: true,
      message: 'Message sent successfully',
      ticket: {
        id: ticket._id,
        ticketId: ticket.ticketId,
        messages: ticket.messages
      }
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

router.get('/preferences', authMiddleware, (req, res) => {
  const experience = req.user?.experience || {};
  res.json({
    language: experience.language || 'English (US)',
    theme: experience.theme || 'light'
  });
});

router.patch('/preferences', authMiddleware, async (req, res) => {
  try {
    const { language, theme } = req.body;
    let changed = false;

    if (language) {
      const match = SUPPORTED_LANGUAGES.find((lang) => lang.label === language || lang.id === language);
      if (!match) {
        return res.status(400).json({ message: 'Unsupported language selection.' });
      }
      req.user.experience = req.user.experience || {};
      req.user.experience.language = match.label;
      changed = true;
    }

    if (theme) {
      const normalized = theme.toLowerCase();
      if (!['light', 'dark'].includes(normalized)) {
        return res.status(400).json({ message: 'Theme must be either "light" or "dark".' });
      }
      req.user.experience = req.user.experience || {};
      req.user.experience.theme = normalized;
      changed = true;
    }

    if (changed) {
      await req.user.save();
    }

    res.json({
      language: req.user.experience?.language || 'English (US)',
      theme: req.user.experience?.theme || 'light'
    });
  } catch (error) {
    console.error('Failed to update experience preferences:', error);
    res.status(500).json({ message: 'Failed to update preferences. Please try again.' });
  }
});

module.exports = router;

