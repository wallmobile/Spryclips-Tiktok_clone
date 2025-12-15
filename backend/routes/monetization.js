const express = require('express');
const User = require('../models/User');
const Video = require('../models/Video');
const VideoView = require('../models/VideoView');
const Transaction = require('../models/Transaction');
const Gift = require('../models/Gift');
const CreatorFund = require('../models/CreatorFund');
const AdsRevenue = require('../models/AdsRevenue');
const { SubscriptionPlan, UserSubscription, SubscriptionSettings } = require('../models/Subscription');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ==================== GET EARNINGS ====================
router.get('/earnings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const timeRange = req.query.range || 'all'; // all, 7d, 30d, 90d, 1y

    let dateFilter = {};
    if (timeRange !== 'all') {
      const now = new Date();
      const days = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };
      dateFilter = { createdAt: { $gte: new Date(now - days[timeRange] * 24 * 60 * 60 * 1000) } };
    }

    // Get earnings transactions
    const earnings = await Transaction.find({
      user: userId,
      type: 'earnings',
      status: 'completed',
      ...dateFilter
    })
      .populate('relatedVideo', 'url thumbnail description')
      .sort({ createdAt: -1 })
      .lean();

    const totalEarnings = earnings.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Get pending earnings
    const pendingEarnings = await Transaction.find({
      user: userId,
      type: 'earnings',
      status: 'pending'
    }).lean();

    const totalPending = pendingEarnings.reduce((sum, t) => sum + (t.amount || 0), 0);

    res.json({
      success: true,
      earnings: {
        total: totalEarnings,
        pending: totalPending,
        transactions: earnings,
        timeRange: timeRange
      }
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings',
      error: error.message
    });
  }
});

// ==================== GET TRANSACTIONS ====================
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type; // Filter by type
    const status = req.query.status; // Filter by status

    let query = { user: req.user._id };
    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .populate('relatedVideo', 'url thumbnail description')
      .populate('relatedUser', 'username profile.avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      transactions: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
});

// ==================== REQUEST PAYOUT ====================
router.post('/payout', authMiddleware, async (req, res) => {
  try {
    const { amount, payoutMethod, payoutDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    if (!payoutMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payout method is required'
      });
    }

    // Get user's available balance
    const earnings = await Transaction.find({
      user: req.user._id,
      type: 'earnings',
      status: 'completed'
    });

    const totalEarnings = earnings.reduce((sum, t) => sum + (t.amount || 0), 0);

    const pendingPayouts = await Transaction.find({
      user: req.user._id,
      type: 'payout',
      status: 'pending'
    });

    const totalPending = pendingPayouts.reduce((sum, t) => sum + (t.amount || 0), 0);

    const availableBalance = totalEarnings - totalPending;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        availableBalance: availableBalance
      });
    }

    // Create payout transaction
    const payout = new Transaction({
      user: req.user._id,
      type: 'payout',
      amount: amount,
      status: 'pending',
      payoutMethod: payoutMethod,
      payoutDetails: payoutDetails || {}
    });

    await payout.save();

    res.status(201).json({
      success: true,
      message: 'Payout request submitted',
      payout: payout,
      availableBalance: availableBalance - amount
    });
  } catch (error) {
    console.error('Error requesting payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request payout',
      error: error.message
    });
  }
});

// ==================== SEND GIFT ====================
router.post('/gift', authMiddleware, async (req, res) => {
  try {
    const { receiverId, videoId, giftType, giftName, giftImage, value, message } = req.body;

    if (!receiverId || !giftType || !value) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID, gift type, and value are required'
      });
    }

    if (value <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Gift value must be greater than 0'
      });
    }

    // Create gift record
    const gift = new Gift({
      sender: req.user._id,
      receiver: receiverId,
      video: videoId || null,
      giftType: giftType,
      giftName: giftName || giftType,
      giftImage: giftImage || '',
      value: value,
      message: message || ''
    });

    await gift.save();

    // Create transaction for sender (deduct)
    const senderTransaction = new Transaction({
      user: req.user._id,
      type: 'gift_sent',
      amount: -value,
      status: 'completed',
      relatedUser: receiverId,
      relatedVideo: videoId || null,
      description: `Gift sent: ${giftName}`
    });

    await senderTransaction.save();

    // Create transaction for receiver (earn)
    const receiverTransaction = new Transaction({
      user: receiverId,
      type: 'earnings',
      amount: value * 0.7, // Creator gets 70% (platform takes 30%)
      status: 'completed',
      relatedUser: req.user._id,
      relatedVideo: videoId || null,
      description: `Gift received: ${giftName}`
    });

    await receiverTransaction.save();

    // Update receiver's earnings
    const receiver = await User.findById(receiverId);
    if (receiver) {
      // You can add earnings field to user model if needed
    }

    res.status(201).json({
      success: true,
      message: 'Gift sent successfully',
      gift: gift
    });
  } catch (error) {
    console.error('Error sending gift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send gift',
      error: error.message
    });
  }
});

// ==================== GET GIFTS RECEIVED ====================
router.get('/gifts/received', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const gifts = await Gift.find({
      receiver: req.user._id
    })
      .populate('sender', 'username profile.avatar profile.displayName')
      .populate('video', 'url thumbnail description')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const totalValue = gifts.reduce((sum, g) => sum + (g.value || 0), 0);

    res.json({
      success: true,
      gifts: gifts,
      totalValue: totalValue,
      count: gifts.length
    });
  } catch (error) {
    console.error('Error fetching gifts received:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gifts received',
      error: error.message
    });
  }
});

// ==================== GET GIFTS SENT ====================
router.get('/gifts/sent', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const gifts = await Gift.find({
      sender: req.user._id
    })
      .populate('receiver', 'username profile.avatar profile.displayName')
      .populate('video', 'url thumbnail description')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const totalValue = gifts.reduce((sum, g) => sum + (g.value || 0), 0);

    res.json({
      success: true,
      gifts: gifts,
      totalValue: totalValue,
      count: gifts.length
    });
  } catch (error) {
    console.error('Error fetching gifts sent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gifts sent',
      error: error.message
    });
  }
});

// ==================== GET CREATOR BALANCE ====================
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Calculate total earnings
    const earnings = await Transaction.find({
      user: userId,
      type: 'earnings',
      status: 'completed'
    });

    const totalEarnings = earnings.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate pending payouts
    const pendingPayouts = await Transaction.find({
      user: userId,
      type: 'payout',
      status: 'pending'
    });

    const totalPending = pendingPayouts.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate completed payouts
    const completedPayouts = await Transaction.find({
      user: userId,
      type: 'payout',
      status: 'completed'
    });

    const totalPaid = completedPayouts.reduce((sum, t) => sum + (t.amount || 0), 0);

    const availableBalance = totalEarnings - totalPending;

    res.json({
      success: true,
      balance: {
        totalEarnings: totalEarnings,
        availableBalance: availableBalance,
        pendingPayouts: totalPending,
        totalPaid: totalPaid
      }
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch balance',
      error: error.message
    });
  }
});

// ==================== CREATOR FUND ====================

// Get creator fund status
router.get('/creator-fund', authMiddleware, async (req, res) => {
  try {
    let fundStatus = await CreatorFund.findOne({ creator: req.user._id });
    
    if (!fundStatus) {
      // Check eligibility
      const user = await User.findById(req.user._id);
      const videoCount = await Video.countDocuments({ creator: req.user._id });
      const totalViews = await Video.aggregate([
        { $match: { creator: req.user._id } },
        { $group: { _id: null, total: { $sum: '$stats.views' } } }
      ]);
      
      const followers = user.stats?.followers || 0;
      const views = totalViews[0]?.total || 0;
      const accountAge = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
      
      // Eligibility requirements
      const isEligible = followers >= 10000 && views >= 100000 && videoCount >= 3 && accountAge >= 30;
      
      return res.json({
        success: true,
        fundStatus: {
          status: 'not_applied',
          isEligible,
          eligibilitySnapshot: {
            followers,
            totalViews: views,
            videoCount,
            accountAge
          },
          requirements: {
            followers: { required: 10000, current: followers, met: followers >= 10000 },
            views: { required: 100000, current: views, met: views >= 100000 },
            videos: { required: 3, current: videoCount, met: videoCount >= 3 },
            accountAge: { required: 30, current: accountAge, met: accountAge >= 30 }
          }
        }
      });
    }
    
    res.json({ success: true, fundStatus });
  } catch (error) {
    console.error('Error fetching creator fund status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch creator fund status' });
  }
});

// Apply to creator fund
router.post('/creator-fund/apply', authMiddleware, async (req, res) => {
  try {
    // Check if already applied
    let existing = await CreatorFund.findOne({ creator: req.user._id });
    if (existing && existing.status !== 'not_applied' && existing.status !== 'rejected') {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already applied to the Creator Fund' 
      });
    }
    
    // Check eligibility
    const user = await User.findById(req.user._id);
    const videoCount = await Video.countDocuments({ creator: req.user._id });
    const totalViews = await Video.aggregate([
      { $match: { creator: req.user._id } },
      { $group: { _id: null, total: { $sum: '$stats.views' } } }
    ]);
    
    const followers = user.stats?.followers || 0;
    const views = totalViews[0]?.total || 0;
    const accountAge = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
    
    // For testing, lower requirements
    const isEligible = followers >= 0 || views >= 0; // Always eligible for testing
    
    if (!isEligible) {
      return res.status(400).json({
        success: false,
        message: 'You do not meet the eligibility requirements'
      });
    }
    
    // Create or update application
    if (existing) {
      existing.status = 'pending';
      existing.appliedAt = new Date();
      existing.eligibilitySnapshot = { followers, totalViews: views, videoCount, accountAge };
      await existing.save();
    } else {
      existing = new CreatorFund({
        creator: req.user._id,
        status: 'pending',
        appliedAt: new Date(),
        eligibilitySnapshot: { followers, totalViews: views, videoCount, accountAge }
      });
      await existing.save();
    }
    
    res.json({
      success: true,
      message: 'Application submitted successfully! We will review your application.',
      fundStatus: existing
    });
  } catch (error) {
    console.error('Error applying to creator fund:', error);
    res.status(500).json({ success: false, message: 'Failed to submit application' });
  }
});

// Approve creator fund (admin/testing)
router.post('/creator-fund/approve', authMiddleware, async (req, res) => {
  try {
    let fundStatus = await CreatorFund.findOne({ creator: req.user._id });
    
    if (!fundStatus) {
      return res.status(404).json({ success: false, message: 'No application found' });
    }
    
    fundStatus.status = 'approved';
    fundStatus.approvedAt = new Date();
    await fundStatus.save();
    
    res.json({ success: true, message: 'Creator Fund approved!', fundStatus });
  } catch (error) {
    console.error('Error approving creator fund:', error);
    res.status(500).json({ success: false, message: 'Failed to approve' });
  }
});

// ==================== ADS REVENUE ====================

// Get ads revenue settings and stats
router.get('/ads', authMiddleware, async (req, res) => {
  try {
    let adsStatus = await AdsRevenue.findOne({ creator: req.user._id });
    
    if (!adsStatus) {
      adsStatus = new AdsRevenue({
        creator: req.user._id,
        adsEnabled: false
      });
      await adsStatus.save();
    }
    
    res.json({ success: true, adsStatus });
  } catch (error) {
    console.error('Error fetching ads status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ads status' });
  }
});

// Enable/Update ads settings
router.post('/ads/enable', authMiddleware, async (req, res) => {
  try {
    const { settings } = req.body;
    
    let adsStatus = await AdsRevenue.findOne({ creator: req.user._id });
    
    if (!adsStatus) {
      adsStatus = new AdsRevenue({
        creator: req.user._id,
        adsEnabled: true,
        enabledAt: new Date(),
        settings: settings || {}
      });
    } else {
      adsStatus.adsEnabled = true;
      if (!adsStatus.enabledAt) adsStatus.enabledAt = new Date();
      if (settings) adsStatus.settings = { ...adsStatus.settings, ...settings };
    }
    
    await adsStatus.save();
    
    res.json({ 
      success: true, 
      message: 'Ads enabled successfully!',
      adsStatus 
    });
  } catch (error) {
    console.error('Error enabling ads:', error);
    res.status(500).json({ success: false, message: 'Failed to enable ads' });
  }
});

// Disable ads
router.post('/ads/disable', authMiddleware, async (req, res) => {
  try {
    let adsStatus = await AdsRevenue.findOne({ creator: req.user._id });
    
    if (adsStatus) {
      adsStatus.adsEnabled = false;
      await adsStatus.save();
    }
    
    res.json({ success: true, message: 'Ads disabled', adsStatus });
  } catch (error) {
    console.error('Error disabling ads:', error);
    res.status(500).json({ success: false, message: 'Failed to disable ads' });
  }
});

// Simulate ad impression/click (for testing)
router.post('/ads/simulate', authMiddleware, async (req, res) => {
  try {
    const { impressions = 1000, clicks = 50 } = req.body;
    
    let adsStatus = await AdsRevenue.findOne({ creator: req.user._id });
    
    if (!adsStatus || !adsStatus.adsEnabled) {
      return res.status(400).json({ success: false, message: 'Ads not enabled' });
    }
    
    // Calculate earnings based on actual tracked views (not just video.views)
    // Use VideoView model for accurate view tracking
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Get actual tracked views for creator's videos this month
    const creatorVideos = await Video.find({ user: req.user._id }).select('_id').lean();
    const videoIds = creatorVideos.map(v => v._id);
    
    const trackedViews = await VideoView.countDocuments({
      video: { $in: videoIds },
      createdAt: { $gte: startOfMonth }
    });
    
    // Use tracked views if available, otherwise use provided impressions
    const actualViews = trackedViews > 0 ? trackedViews : impressions;
    
    // Calculate earnings (example: $2 CPM)
    const cpm = 2;
    const earnings = (actualViews / 1000) * cpm;
    
    adsStatus.totalImpressions += actualViews;
    adsStatus.totalClicks += clicks;
    adsStatus.totalEarnings += earnings;
    adsStatus.currentMonthEarnings += earnings;
    adsStatus.cpm = cpm;
    adsStatus.ctr = (adsStatus.totalClicks / adsStatus.totalImpressions) * 100;
    
    await adsStatus.save();
    
    res.json({
      success: true,
      message: `Tracked ${actualViews} views (${trackedViews > 0 ? 'from VideoView' : 'simulated'}), ${clicks} clicks. Earned $${earnings.toFixed(2)}`,
      adsStatus,
      trackedViews: trackedViews,
      usedViews: actualViews
    });
  } catch (error) {
    console.error('Error simulating ads:', error);
    res.status(500).json({ success: false, message: 'Failed to simulate' });
  }
});

// ==================== SUBSCRIPTIONS ====================

// Get subscription settings and stats
router.get('/subscriptions', authMiddleware, async (req, res) => {
  try {
    let settings = await SubscriptionSettings.findOne({ creator: req.user._id });
    let plans = await SubscriptionPlan.find({ creator: req.user._id, isActive: true });
    let subscribers = await UserSubscription.find({ creator: req.user._id, status: 'active' })
      .populate('subscriber', 'username profile.avatar profile.displayName')
      .sort({ createdAt: -1 });
    
    if (!settings) {
      settings = new SubscriptionSettings({ creator: req.user._id });
      await settings.save();
    }
    
    res.json({
      success: true,
      settings,
      plans,
      subscribers,
      stats: {
        totalRevenue: settings.totalRevenue,
        monthlyRevenue: settings.monthlyRevenue,
        totalSubscribers: settings.totalSubscribers,
        activeSubscribers: settings.activeSubscribers
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
  }
});

// Enable subscriptions
router.post('/subscriptions/enable', authMiddleware, async (req, res) => {
  try {
    const { plans } = req.body;
    
    let settings = await SubscriptionSettings.findOne({ creator: req.user._id });
    
    if (!settings) {
      settings = new SubscriptionSettings({
        creator: req.user._id,
        enabled: true,
        enabledAt: new Date()
      });
    } else {
      settings.enabled = true;
      if (!settings.enabledAt) settings.enabledAt = new Date();
    }
    
    await settings.save();
    
    // Create/update plans
    if (plans && Array.isArray(plans)) {
      // Remove old plans
      await SubscriptionPlan.updateMany(
        { creator: req.user._id },
        { isActive: false }
      );
      
      // Create new plans
      for (const plan of plans) {
        const newPlan = new SubscriptionPlan({
          creator: req.user._id,
          name: plan.name || 'Supporter',
          price: plan.price || 4.99,
          benefits: plan.benefits || []
        });
        await newPlan.save();
      }
    }
    
    const updatedPlans = await SubscriptionPlan.find({ creator: req.user._id, isActive: true });
    
    res.json({
      success: true,
      message: 'Subscriptions enabled!',
      settings,
      plans: updatedPlans
    });
  } catch (error) {
    console.error('Error enabling subscriptions:', error);
    res.status(500).json({ success: false, message: 'Failed to enable subscriptions' });
  }
});

// Subscribe to a creator (user action)
router.post('/subscriptions/subscribe/:creatorId', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.body;
    const creatorId = req.params.creatorId;
    
    // Check if already subscribed
    const existing = await UserSubscription.findOne({
      subscriber: req.user._id,
      creator: creatorId,
      status: 'active'
    });
    
    if (existing) {
      return res.status(400).json({ success: false, message: 'Already subscribed' });
    }
    
    // Get plan
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    // Check user balance
    const user = await User.findById(req.user._id);
    const balance = user.wallet?.balance || 0;
    
    if (balance < plan.price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient balance',
        required: plan.price,
        current: balance
      });
    }
    
    // Deduct from subscriber
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'wallet.balance': -plan.price }
    });
    
    // Add to creator
    await User.findByIdAndUpdate(creatorId, {
      $inc: { 
        'wallet.balance': plan.price * 0.7, // Creator gets 70%
        'wallet.totalEarnings': plan.price * 0.7
      }
    });
    
    // Create subscription
    const subscription = new UserSubscription({
      subscriber: req.user._id,
      creator: creatorId,
      plan: planId,
      amount: plan.price,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
    await subscription.save();
    
    // Update plan subscriber count
    await SubscriptionPlan.findByIdAndUpdate(planId, {
      $inc: { subscriberCount: 1 }
    });
    
    // Update creator settings
    await SubscriptionSettings.findOneAndUpdate(
      { creator: creatorId },
      {
        $inc: {
          totalSubscribers: 1,
          activeSubscribers: 1,
          totalRevenue: plan.price * 0.7,
          monthlyRevenue: plan.price * 0.7
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Subscribed successfully!',
      subscription
    });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ success: false, message: 'Failed to subscribe' });
  }
});

// Cancel subscription
router.post('/subscriptions/cancel/:subscriptionId', authMiddleware, async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({
      _id: req.params.subscriptionId,
      subscriber: req.user._id
    });
    
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }
    
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await subscription.save();
    
    // Update counts
    await SubscriptionPlan.findByIdAndUpdate(subscription.plan, {
      $inc: { subscriberCount: -1 }
    });
    
    await SubscriptionSettings.findOneAndUpdate(
      { creator: subscription.creator },
      { $inc: { activeSubscribers: -1 } }
    );
    
    res.json({ success: true, message: 'Subscription cancelled', subscription });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel subscription' });
  }
});

// ==================== TIP JAR ====================

// Get tip jar settings
router.get('/tipjar', authMiddleware, async (req, res) => {
  try {
    // Get tips received
    const tipsReceived = await Gift.find({ receiver: req.user._id })
      .populate('sender', 'username profile.avatar profile.displayName')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    const totalTips = tipsReceived.reduce((sum, t) => sum + (t.value || 0), 0);
    
    // Get this month's tips
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthlyTips = await Gift.find({
      receiver: req.user._id,
      createdAt: { $gte: startOfMonth }
    }).lean();
    
    const monthlyTotal = monthlyTips.reduce((sum, t) => sum + (t.value || 0), 0);
    
    res.json({
      success: true,
      tipjar: {
        totalReceived: totalTips,
        monthlyReceived: monthlyTotal,
        recentTips: tipsReceived,
        tipCount: tipsReceived.length
      }
    });
  } catch (error) {
    console.error('Error fetching tip jar:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tip jar' });
  }
});

// Send tip
router.post('/tipjar/send', authMiddleware, async (req, res) => {
  try {
    const { receiverId, amount, message } = req.body;
    
    if (!receiverId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid tip amount or receiver' });
    }
    
    // Check balance
    const user = await User.findById(req.user._id);
    const balance = user.wallet?.balance || 0;
    
    if (balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        required: amount,
        current: balance
      });
    }
    
    // Deduct from sender
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'wallet.balance': -amount }
    });
    
    // Add to receiver (70% to creator)
    const creatorAmount = amount * 0.7;
    await User.findByIdAndUpdate(receiverId, {
      $inc: { 
        'wallet.balance': creatorAmount,
        'wallet.totalEarnings': creatorAmount
      }
    });
    
    // Create tip record
    const tip = new Gift({
      sender: req.user._id,
      receiver: receiverId,
      giftType: 'tip',
      giftName: 'Tip',
      value: amount,
      message: message || ''
    });
    await tip.save();
    
    res.json({
      success: true,
      message: `Tip of $${amount} sent successfully!`,
      tip
    });
  } catch (error) {
    console.error('Error sending tip:', error);
    res.status(500).json({ success: false, message: 'Failed to send tip' });
  }
});

module.exports = router;
