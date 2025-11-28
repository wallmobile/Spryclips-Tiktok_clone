const express = require('express');
const router = express.Router();
const Partnership = require('../models/Partnership');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Get all partnerships for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const partnerships = await Partnership.find({ creator: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ partnerships });
  } catch (error) {
    console.error('Error fetching partnerships:', error);
    res.status(500).json({ message: 'Failed to fetch partnerships' });
  }
});

// Get partnership stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const [total, pending, active, completed] = await Promise.all([
      Partnership.countDocuments({ creator: userId }),
      Partnership.countDocuments({ creator: userId, status: 'pending' }),
      Partnership.countDocuments({ creator: userId, status: { $in: ['active', 'in_progress'] } }),
      Partnership.countDocuments({ creator: userId, status: 'completed' })
    ]);
    
    const totalEarnings = await Partnership.aggregate([
      { $match: { creator: userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]);
    
    const pendingEarnings = await Partnership.aggregate([
      { $match: { creator: userId, status: { $in: ['active', 'in_progress', 'review'] } } },
      { $group: { _id: null, total: { $sum: '$budget' } } }
    ]);
    
    res.json({
      stats: {
        total,
        pending,
        active,
        completed,
        totalEarnings: totalEarnings[0]?.total || 0,
        pendingEarnings: pendingEarnings[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching partnership stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// Create new partnership request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      brandName,
      brandEmail,
      campaignName,
      campaignType,
      budget,
      totalDeliverables,
      deadline,
      description,
      requirements
    } = req.body;
    
    // Validation
    if (!brandName || !brandEmail || !campaignName || !budget || !deadline || !description) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }
    
    // Check if deadline is in the future
    if (new Date(deadline) <= new Date()) {
      return res.status(400).json({ message: 'Deadline must be in the future' });
    }
    
    // Check minimum budget
    if (budget < 10) {
      return res.status(400).json({ message: 'Minimum budget is $10' });
    }
    
    // Create partnership
    const partnership = new Partnership({
      creator: req.user._id,
      brandName,
      brandEmail,
      campaignName,
      campaignType: campaignType || 'sponsored',
      budget,
      totalDeliverables: totalDeliverables || 1,
      deadline: new Date(deadline),
      description,
      requirements: requirements || '',
      status: 'pending'
    });
    
    await partnership.save();
    
    // TODO: Send email to brand for approval
    // await sendPartnershipRequestEmail(brandEmail, partnership, req.user);
    
    res.status(201).json({
      message: 'Partnership request created successfully! Waiting for brand approval.',
      partnership
    });
  } catch (error) {
    console.error('Error creating partnership:', error);
    res.status(500).json({ message: 'Failed to create partnership' });
  }
});

// Get single partnership
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const partnership = await Partnership.findOne({
      _id: req.params.id,
      creator: req.user._id
    }).populate('creator', 'username profile');
    
    if (!partnership) {
      return res.status(404).json({ message: 'Partnership not found' });
    }
    
    res.json({ partnership });
  } catch (error) {
    console.error('Error fetching partnership:', error);
    res.status(500).json({ message: 'Failed to fetch partnership' });
  }
});

// Update partnership (only if pending/draft)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const partnership = await Partnership.findOne({
      _id: req.params.id,
      creator: req.user._id
    });
    
    if (!partnership) {
      return res.status(404).json({ message: 'Partnership not found' });
    }
    
    // Can only edit if pending or draft
    if (!['pending', 'draft'].includes(partnership.status)) {
      return res.status(400).json({ message: 'Cannot edit active or completed partnerships' });
    }
    
    const allowedUpdates = ['brandName', 'brandEmail', 'campaignName', 'campaignType', 
                           'budget', 'totalDeliverables', 'deadline', 'description', 'requirements'];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        partnership[field] = req.body[field];
      }
    });
    
    await partnership.save();
    
    res.json({ message: 'Partnership updated', partnership });
  } catch (error) {
    console.error('Error updating partnership:', error);
    res.status(500).json({ message: 'Failed to update partnership' });
  }
});

// Cancel partnership request
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const partnership = await Partnership.findOne({
      _id: req.params.id,
      creator: req.user._id
    });
    
    if (!partnership) {
      return res.status(404).json({ message: 'Partnership not found' });
    }
    
    // Can only cancel if pending
    if (partnership.status !== 'pending') {
      return res.status(400).json({ message: 'Can only cancel pending partnerships' });
    }
    
    partnership.status = 'cancelled';
    await partnership.save();
    
    res.json({ message: 'Partnership cancelled', partnership });
  } catch (error) {
    console.error('Error cancelling partnership:', error);
    res.status(500).json({ message: 'Failed to cancel partnership' });
  }
});

// Complete a deliverable
router.post('/:id/deliverable/:index/complete', authMiddleware, async (req, res) => {
  try {
    const partnership = await Partnership.findOne({
      _id: req.params.id,
      creator: req.user._id
    });
    
    if (!partnership) {
      return res.status(404).json({ message: 'Partnership not found' });
    }
    
    if (!['active', 'in_progress'].includes(partnership.status)) {
      return res.status(400).json({ message: 'Partnership is not active' });
    }
    
    // Increment completed count
    if (partnership.completedDeliverables < partnership.totalDeliverables) {
      partnership.completedDeliverables += 1;
      partnership.status = 'in_progress';
      
      // If all deliverables completed, move to review
      if (partnership.completedDeliverables >= partnership.totalDeliverables) {
        partnership.status = 'review';
      }
      
      await partnership.save();
    }
    
    res.json({ message: 'Deliverable marked complete', partnership });
  } catch (error) {
    console.error('Error completing deliverable:', error);
    res.status(500).json({ message: 'Failed to complete deliverable' });
  }
});

// ============ BRAND/ADMIN ACTIONS ============

// Approve partnership (brand/admin OR creator for testing)
router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const partnership = await Partnership.findById(req.params.id);
    
    if (!partnership) {
      return res.status(404).json({ message: 'Partnership not found' });
    }
    
    // Check if user is admin, brand, or creator (creator allowed for testing)
    const user = await User.findById(req.user._id);
    const isAdmin = user.role === 'admin';
    const isBrand = user.email?.toLowerCase() === partnership.brandEmail?.toLowerCase();
    const isCreator = partnership.creator.toString() === req.user._id.toString();
    
    // Allow creator to self-approve for testing
    if (!isAdmin && !isBrand && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to approve this partnership' });
    }
    
    if (partnership.status !== 'pending') {
      return res.status(400).json({ message: 'Partnership is not pending approval' });
    }
    
    partnership.status = 'active';
    partnership.approvedBy = req.user._id;
    partnership.approvedAt = new Date();
    partnership.startDate = new Date();
    
    await partnership.save();
    
    res.json({ message: 'Partnership approved!', partnership });
  } catch (error) {
    console.error('Error approving partnership:', error);
    res.status(500).json({ message: 'Failed to approve partnership' });
  }
});

// Reject partnership
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const partnership = await Partnership.findById(req.params.id);
    
    if (!partnership) {
      return res.status(404).json({ message: 'Partnership not found' });
    }
    
    const user = await User.findById(req.user._id);
    const isAdmin = user.role === 'admin';
    const isBrand = user.email?.toLowerCase() === partnership.brandEmail?.toLowerCase();
    
    if (!isAdmin && !isBrand) {
      return res.status(403).json({ message: 'Not authorized to reject this partnership' });
    }
    
    partnership.status = 'rejected';
    partnership.rejectionReason = req.body.reason || 'No reason provided';
    
    await partnership.save();
    
    res.json({ message: 'Partnership rejected', partnership });
  } catch (error) {
    console.error('Error rejecting partnership:', error);
    res.status(500).json({ message: 'Failed to reject partnership' });
  }
});

// Mark partnership as completed (after review)
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const partnership = await Partnership.findById(req.params.id);
    
    if (!partnership) {
      return res.status(404).json({ message: 'Partnership not found' });
    }
    
    const user = await User.findById(req.user._id);
    const isAdmin = user.role === 'admin';
    const isBrand = user.email?.toLowerCase() === partnership.brandEmail?.toLowerCase();
    const isCreator = partnership.creator.toString() === req.user._id.toString();
    
    if (!isAdmin && !isBrand && !isCreator) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (!['review', 'in_progress', 'active'].includes(partnership.status)) {
      return res.status(400).json({ message: 'Partnership cannot be marked complete' });
    }
    
    partnership.status = 'completed';
    partnership.completedAt = new Date();
    partnership.amountPaid = partnership.budget;
    partnership.paymentStatus = 'paid';
    
    // Add earnings to creator's balance
    await User.findByIdAndUpdate(partnership.creator, {
      $inc: { 
        'wallet.balance': partnership.budget,
        'wallet.totalEarnings': partnership.budget
      }
    });
    
    await partnership.save();
    
    res.json({ 
      message: 'Partnership completed! Payment has been added to your balance.',
      partnership 
    });
  } catch (error) {
    console.error('Error completing partnership:', error);
    res.status(500).json({ message: 'Failed to complete partnership' });
  }
});

module.exports = router;


