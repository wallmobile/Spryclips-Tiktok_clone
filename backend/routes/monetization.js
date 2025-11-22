const express = require('express');
const User = require('../models/User');
const Video = require('../models/Video');
const Transaction = require('../models/Transaction');
const Gift = require('../models/Gift');
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

module.exports = router;

