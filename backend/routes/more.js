const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const SUPPORTED_LANGUAGES = [
  { id: 'en_us', label: 'English (US)' },
  { id: 'en_uk', label: 'English (UK)' },
  { id: 'es_es', label: 'Español' },
  { id: 'fr_fr', label: 'Français' },
  { id: 'de_de', label: 'Deutsch' },
  { id: 'hi_in', label: 'हिन्दी' },
  { id: 'ur_pk', label: 'اردو' }
];

router.get('/studio', authMiddleware, (_req, res) => {
  res.json({
    overview: {
      totalViews: 482300,
      totalFollowers: 19200,
      totalWatchTimeMinutes: 174560,
      liveSessionsHosted: 34,
      estimatedEarnings: 942.35
    },
    performanceTrend: [
      { label: 'Mon', views: 5200, engagementRate: 5.4 },
      { label: 'Tue', views: 7800, engagementRate: 6.1 },
      { label: 'Wed', views: 9600, engagementRate: 6.9 },
      { label: 'Thu', views: 10200, engagementRate: 7.3 },
      { label: 'Fri', views: 12000, engagementRate: 7.8 },
      { label: 'Sat', views: 8900, engagementRate: 6.5 },
      { label: 'Sun', views: 6100, engagementRate: 5.1 }
    ],
    topVideos: [
      {
        id: 'vid-1',
        title: 'How to grow on TikTok in 2025',
        views: 78340,
        likes: 12500,
        comments: 640,
        shares: 980,
        completionRate: 72
      },
      {
        id: 'vid-2',
        title: 'Daily content workflow',
        views: 62310,
        likes: 8400,
        comments: 420,
        shares: 760,
        completionRate: 65
      },
      {
        id: 'vid-3',
        title: 'Behind the scenes live setup',
        views: 45460,
        likes: 5100,
        comments: 218,
        shares: 540,
        completionRate: 59
      }
    ],
    streamSchedule: [
      {
        id: 'session-1',
        title: 'Creator AMA Live',
        scheduledFor: new Date(Date.now() + 36 * 60 * 60 * 1000),
        status: 'upcoming'
      },
      {
        id: 'session-2',
        title: 'Editing masterclass',
        scheduledFor: new Date(Date.now() + 72 * 60 * 60 * 1000),
        status: 'upcoming'
      },
      {
        id: 'session-3',
        title: 'Performance recap',
        scheduledFor: new Date(Date.now() - 12 * 60 * 60 * 1000),
        status: 'completed'
      }
    ],
    actionableInsights: [
      {
        id: 'insight-1',
        priority: 'high',
        title: 'High retention on short tips',
        message: 'Videos under 45 seconds are performing 32% better than the channel average.'
      },
      {
        id: 'insight-2',
        priority: 'medium',
        title: 'Audience active at 7 PM',
        message: 'Your followers are most active between 7-9 PM. Publishing during this window improves reach.'
      },
      {
        id: 'insight-3',
        priority: 'low',
        title: 'Collaboration opportunity',
        message: 'Creators similar to you gained 12% more followers by hosting weekly collabs.'
      }
    ]
  });
});

router.get('/effects', authMiddleware, (_req, res) => {
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

router.get('/growth', authMiddleware, (_req, res) => {
  res.json({
    analytics: {
      followerGain: {
        weekly: 920,
        monthly: 3140,
        growthRate: 18.6
      },
      averageViewDurationSeconds: 37,
      hashtagsPerforming: ['#creatortips', '#workflow', '#behindthescenes']
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
    ]
  });
});

router.get('/support', authMiddleware, (_req, res) => {
  res.json({
    contactChannels: [
      {
        id: 'support-chat',
        title: 'Chat with creator support',
        availability: '24/7',
        averageResponseMinutes: 5
      },
      {
        id: 'support-email',
        title: 'Email support',
        availability: 'Replies within 24 hours',
        averageResponseMinutes: 60 * 12
      }
    ],
    helpTopics: [
      {
        id: 'account-help',
        title: 'Account & Security',
        articles: [
          'Enable two-factor authentication',
          'Recognize official TikTok communication',
          'Recover access to a locked account'
        ]
      },
      {
        id: 'monetization-help',
        title: 'Monetization & payouts',
        articles: [
          'Eligibility for creator programs',
          'Set up payout methods',
          'Resolve a payout hold'
        ]
      },
      {
        id: 'policy-help',
        title: 'Policies & Reporting',
        articles: [
          'Content guidelines reference',
          'Appeal a content removal',
          'Report impersonation'
        ]
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
      }
    ]
  });
});

router.get('/languages', authMiddleware, (_req, res) => {
  res.json({
    languages: SUPPORTED_LANGUAGES
  });
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

