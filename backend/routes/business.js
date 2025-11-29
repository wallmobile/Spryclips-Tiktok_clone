const express = require('express');
const router = express.Router();
const { BusinessProfile, AdCampaign, PromoCode, BusinessAnalytics, SavedAudience, BrandPartnership, BusinessConversation, QuickReply } = require('../models/Business');
const Product = require('../models/Product');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// ==================== BUSINESS PROFILE ====================

// Get business profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    let profile = await BusinessProfile.findOne({ user: req.user._id });
    
    if (!profile) {
      // Create default profile
      profile = new BusinessProfile({
        user: req.user._id,
        businessName: req.user.username,
        stats: {
          totalReach: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          adSpend: 0
        }
      });
      await profile.save();
    }
    
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Error fetching business profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// Update business profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { businessName, businessType, industry, description, website } = req.body;
    
    let profile = await BusinessProfile.findOne({ user: req.user._id });
    
    if (!profile) {
      profile = new BusinessProfile({ user: req.user._id });
    }
    
    if (businessName) profile.businessName = businessName;
    if (businessType) profile.businessType = businessType;
    if (industry) profile.industry = industry;
    if (description !== undefined) profile.description = description;
    if (website !== undefined) profile.website = website;
    
    await profile.save();
    
    res.json({ success: true, message: 'Profile updated', profile });
  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// Apply for business verification
router.post('/verification/apply', authMiddleware, async (req, res) => {
  try {
    let profile = await BusinessProfile.findOne({ user: req.user._id });
    
    if (!profile) {
      profile = new BusinessProfile({ user: req.user._id });
    }
    
    if (profile.verificationStatus === 'pending') {
      return res.status(400).json({ success: false, message: 'Verification already pending' });
    }
    
    if (profile.isVerified) {
      return res.status(400).json({ success: false, message: 'Already verified' });
    }
    
    profile.verificationStatus = 'pending';
    await profile.save();
    
    res.json({ success: true, message: 'Verification application submitted', profile });
  } catch (error) {
    console.error('Error applying for verification:', error);
    res.status(500).json({ success: false, message: 'Failed to apply for verification' });
  }
});

// Approve verification (for testing)
router.post('/verification/approve', authMiddleware, async (req, res) => {
  try {
    let profile = await BusinessProfile.findOne({ user: req.user._id });
    
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    
    profile.verificationStatus = 'approved';
    profile.isVerified = true;
    profile.verificationDate = new Date();
    await profile.save();
    
    res.json({ success: true, message: 'Business verified!', profile });
  } catch (error) {
    console.error('Error approving verification:', error);
    res.status(500).json({ success: false, message: 'Failed to approve' });
  }
});

// ==================== BIO LINK ====================

// Update bio link
router.put('/bio-link', authMiddleware, async (req, res) => {
  try {
    const { enabled, url, title } = req.body;
    
    let profile = await BusinessProfile.findOne({ user: req.user._id });
    
    if (!profile) {
      profile = new BusinessProfile({ user: req.user._id });
    }
    
    profile.bioLink = {
      enabled: enabled !== undefined ? enabled : profile.bioLink.enabled,
      url: url !== undefined ? url : profile.bioLink.url,
      title: title !== undefined ? title : profile.bioLink.title,
      clicks: profile.bioLink.clicks || 0
    };
    
    await profile.save();
    
    res.json({ success: true, message: 'Bio link updated', bioLink: profile.bioLink });
  } catch (error) {
    console.error('Error updating bio link:', error);
    res.status(500).json({ success: false, message: 'Failed to update bio link' });
  }
});

// Track bio link click
router.post('/bio-link/click/:userId', async (req, res) => {
  try {
    const profile = await BusinessProfile.findOne({ user: req.params.userId });
    
    if (profile && profile.bioLink.enabled) {
      profile.bioLink.clicks += 1;
      profile.stats.totalClicks += 1;
      await profile.save();
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ success: false });
  }
});

// ==================== AD CAMPAIGNS ====================

// Get all campaigns
router.get('/campaigns', authMiddleware, async (req, res) => {
  try {
    const campaigns = await AdCampaign.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    
    // Calculate totals
    const totals = campaigns.reduce((acc, c) => ({
      totalBudget: acc.totalBudget + c.budget,
      totalSpent: acc.totalSpent + c.spent,
      totalImpressions: acc.totalImpressions + c.performance.impressions,
      totalClicks: acc.totalClicks + c.performance.clicks,
      totalConversions: acc.totalConversions + c.performance.conversions
    }), { totalBudget: 0, totalSpent: 0, totalImpressions: 0, totalClicks: 0, totalConversions: 0 });
    
    res.json({ success: true, campaigns, totals });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
  }
});

// Create campaign
router.post('/campaigns', authMiddleware, async (req, res) => {
  try {
    const {
      name, objective, budget, dailyBudget, targeting, creative, startDate, endDate
    } = req.body;
    
    if (!name || !budget) {
      return res.status(400).json({ success: false, message: 'Name and budget are required' });
    }
    
    // Check user balance
    const user = await User.findById(req.user._id);
    const userBalance = user.wallet?.balance || 0;
    
    if (userBalance < budget) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        required: budget,
        available: userBalance
      });
    }
    
    const campaign = new AdCampaign({
      user: req.user._id,
      name,
      objective: objective || 'awareness',
      budget,
      dailyBudget: dailyBudget || Math.ceil(budget / 7),
      targeting: targeting || {},
      creative: creative || {},
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'pending'
    });
    
    await campaign.save();
    
    // Deduct budget from user wallet
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'wallet.balance': -budget }
    });
    
    // Update business profile stats
    await BusinessProfile.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { 'stats.adSpend': budget } },
      { upsert: true }
    );
    
    res.status(201).json({ success: true, message: 'Campaign created', campaign });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ success: false, message: 'Failed to create campaign' });
  }
});

// Update campaign status
router.put('/campaigns/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    
    const campaign = await AdCampaign.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    
    campaign.status = status;
    await campaign.save();
    
    res.json({ success: true, message: 'Campaign status updated', campaign });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ success: false, message: 'Failed to update campaign' });
  }
});

// Simulate campaign performance (for testing)
router.post('/campaigns/:id/simulate', authMiddleware, async (req, res) => {
  try {
    const campaign = await AdCampaign.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    
    // Simulate random performance
    const impressions = Math.floor(Math.random() * 10000) + 1000;
    const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01));
    const conversions = Math.floor(clicks * (Math.random() * 0.1 + 0.02));
    const spent = Math.min(campaign.budget * 0.1, campaign.budget - campaign.spent);
    
    campaign.performance.impressions += impressions;
    campaign.performance.clicks += clicks;
    campaign.performance.conversions += conversions;
    campaign.performance.ctr = (campaign.performance.clicks / campaign.performance.impressions) * 100;
    campaign.performance.cpc = campaign.spent / Math.max(campaign.performance.clicks, 1);
    campaign.performance.cpm = (campaign.spent / campaign.performance.impressions) * 1000;
    campaign.spent += spent;
    
    if (campaign.status === 'pending') {
      campaign.status = 'active';
    }
    
    await campaign.save();
    
    // Update business profile stats
    await BusinessProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        $inc: {
          'stats.totalImpressions': impressions,
          'stats.totalClicks': clicks,
          'stats.totalConversions': conversions,
          'stats.totalReach': Math.floor(impressions * 0.8)
        }
      }
    );
    
    res.json({
      success: true,
      message: `Simulated: ${impressions} impressions, ${clicks} clicks, ${conversions} conversions`,
      campaign
    });
  } catch (error) {
    console.error('Error simulating campaign:', error);
    res.status(500).json({ success: false, message: 'Failed to simulate' });
  }
});

// Delete campaign
router.delete('/campaigns/:id', authMiddleware, async (req, res) => {
  try {
    const campaign = await AdCampaign.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    
    // Refund unspent budget
    const refund = campaign.budget - campaign.spent;
    if (refund > 0) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'wallet.balance': refund }
      });
    }
    
    await AdCampaign.deleteOne({ _id: req.params.id });
    
    res.json({ success: true, message: 'Campaign deleted', refunded: refund });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ success: false, message: 'Failed to delete campaign' });
  }
});

// ==================== PROMO CODES ====================

// Get all promo codes
router.get('/promo-codes', authMiddleware, async (req, res) => {
  try {
    const promoCodes = await PromoCode.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({ success: true, promoCodes });
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo codes' });
  }
});

// Create promo code
router.post('/promo-codes', authMiddleware, async (req, res) => {
  try {
    const { code, discountType, discountValue, maxUses, minPurchase, endDate } = req.body;
    
    if (!code || !discountValue || !endDate) {
      return res.status(400).json({ success: false, message: 'Code, discount value, and end date are required' });
    }
    
    // Check if code already exists
    const existing = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Promo code already exists' });
    }
    
    const promoCode = new PromoCode({
      user: req.user._id,
      code: code.toUpperCase(),
      discountType: discountType || 'percentage',
      discountValue,
      maxUses: maxUses || 100,
      minPurchase: minPurchase || 0,
      endDate: new Date(endDate)
    });
    
    await promoCode.save();
    
    res.status(201).json({ success: true, message: 'Promo code created', promoCode });
  } catch (error) {
    console.error('Error creating promo code:', error);
    res.status(500).json({ success: false, message: 'Failed to create promo code' });
  }
});

// Toggle promo code status
router.put('/promo-codes/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const promoCode = await PromoCode.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!promoCode) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }
    
    promoCode.isActive = !promoCode.isActive;
    await promoCode.save();
    
    res.json({ success: true, message: `Promo code ${promoCode.isActive ? 'activated' : 'deactivated'}`, promoCode });
  } catch (error) {
    console.error('Error toggling promo code:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle promo code' });
  }
});

// Use promo code (for testing)
router.post('/promo-codes/:code/use', authMiddleware, async (req, res) => {
  try {
    const { orderAmount } = req.body;
    
    const promoCode = await PromoCode.findOne({
      code: req.params.code.toUpperCase(),
      isActive: true
    });
    
    if (!promoCode) {
      return res.status(404).json({ success: false, message: 'Invalid promo code' });
    }
    
    if (promoCode.currentUses >= promoCode.maxUses) {
      return res.status(400).json({ success: false, message: 'Promo code usage limit reached' });
    }
    
    if (new Date() > promoCode.endDate) {
      return res.status(400).json({ success: false, message: 'Promo code expired' });
    }
    
    if (orderAmount < promoCode.minPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of $${promoCode.minPurchase} required`
      });
    }
    
    // Calculate discount
    let discountAmount;
    if (promoCode.discountType === 'percentage') {
      discountAmount = (orderAmount * promoCode.discountValue) / 100;
    } else {
      discountAmount = promoCode.discountValue;
    }
    
    // Update promo code usage
    promoCode.currentUses += 1;
    promoCode.usageHistory.push({
      usedBy: req.user._id,
      orderAmount,
      discountAmount
    });
    await promoCode.save();
    
    res.json({
      success: true,
      message: 'Promo code applied',
      discount: discountAmount,
      finalAmount: orderAmount - discountAmount
    });
  } catch (error) {
    console.error('Error using promo code:', error);
    res.status(500).json({ success: false, message: 'Failed to apply promo code' });
  }
});

// Delete promo code
router.delete('/promo-codes/:id', authMiddleware, async (req, res) => {
  try {
    await PromoCode.deleteOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    res.json({ success: true, message: 'Promo code deleted' });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({ success: false, message: 'Failed to delete promo code' });
  }
});

// ==================== BUSINESS ANALYTICS ====================

// Get business analytics
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const analytics = await BusinessAnalytics.find({
      user: req.user._id,
      date: { $gte: startDate }
    }).sort({ date: -1 });
    
    // Get profile stats
    const profile = await BusinessProfile.findOne({ user: req.user._id });
    
    // Get campaign stats
    const campaigns = await AdCampaign.find({ user: req.user._id });
    const campaignStats = campaigns.reduce((acc, c) => ({
      totalCampaigns: acc.totalCampaigns + 1,
      activeCampaigns: acc.activeCampaigns + (c.status === 'active' ? 1 : 0),
      totalBudget: acc.totalBudget + c.budget,
      totalSpent: acc.totalSpent + c.spent
    }), { totalCampaigns: 0, activeCampaigns: 0, totalBudget: 0, totalSpent: 0 });
    
    // Get promo code stats
    const promoCodes = await PromoCode.find({ user: req.user._id });
    const promoStats = promoCodes.reduce((acc, p) => ({
      totalCodes: acc.totalCodes + 1,
      activeCodes: acc.activeCodes + (p.isActive ? 1 : 0),
      totalUses: acc.totalUses + p.currentUses
    }), { totalCodes: 0, activeCodes: 0, totalUses: 0 });
    
    res.json({
      success: true,
      analytics,
      profile: profile?.stats || {},
      campaignStats,
      promoStats
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// Get business dashboard summary
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    // Get profile
    let profile = await BusinessProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new BusinessProfile({ user: req.user._id });
      await profile.save();
    }
    
    // Get campaigns count
    const campaignsCount = await AdCampaign.countDocuments({ user: req.user._id });
    const activeCampaigns = await AdCampaign.countDocuments({ user: req.user._id, status: 'active' });
    
    // Get promo codes count
    const promoCodesCount = await PromoCode.countDocuments({ user: req.user._id });
    const activePromoCodes = await PromoCode.countDocuments({ user: req.user._id, isActive: true });
    const totalPromoUses = await PromoCode.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: null, total: { $sum: '$currentUses' } } }
    ]);
    
    // Get partnerships count
    const partnershipsCount = await BrandPartnership.countDocuments({ user: req.user._id });
    const activePartnerships = await BrandPartnership.countDocuments({ user: req.user._id, status: 'active' });
    
    // Product catalog status - get actual count from Product collection
    const productsCount = await Product.countDocuments({ seller: req.user._id });
    const activeProducts = await Product.countDocuments({ seller: req.user._id, isActive: true });
    
    // Messaging status (check if enabled in profile)
    const messagingEnabled = profile.messagingEnabled || false;
    const unreadMessages = profile.unreadMessages || 0;
    
    res.json({
      success: true,
      dashboard: {
        profile: {
          businessName: profile.businessName,
          businessType: profile.businessType,
          isVerified: profile.isVerified,
          verificationStatus: profile.verificationStatus,
          bioLink: profile.bioLink
        },
        stats: profile.stats,
        campaigns: {
          total: campaignsCount,
          active: activeCampaigns
        },
        promoCodes: {
          total: promoCodesCount,
          active: activePromoCodes,
          totalUses: totalPromoUses[0]?.total || 0
        },
        partnerships: {
          total: partnershipsCount,
          active: activePartnerships
        },
        products: {
          count: productsCount,
          active: activeProducts
        },
        messaging: {
          enabled: messagingEnabled,
          unread: unreadMessages
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
  }
});

// ==================== SAVED AUDIENCES ====================

// Get all audiences
router.get('/audiences', authMiddleware, async (req, res) => {
  try {
    const audiences = await SavedAudience.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, audiences });
  } catch (error) {
    console.error('Error fetching audiences:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audiences' });
  }
});

// Create audience
router.post('/audiences', authMiddleware, async (req, res) => {
  try {
    const { name, description, demographics, interests, locations, languages } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Audience name is required' });
    }
    
    // Calculate estimated size based on targeting
    const baseSize = 10000000; // 10M base
    let multiplier = 1;
    
    // Age range affects size
    const ageRange = (demographics?.ageMax || 65) - (demographics?.ageMin || 18);
    multiplier *= (ageRange / 47); // 47 is full range
    
    // Gender affects size
    if (demographics?.gender !== 'all') multiplier *= 0.5;
    
    // Interests narrow down
    if (interests?.length > 0) multiplier *= Math.max(0.1, 1 - (interests.length * 0.15));
    
    // Locations narrow down
    if (locations?.length > 0) multiplier *= Math.max(0.05, locations.length * 0.1);
    
    const estimatedMin = Math.floor(baseSize * multiplier * 0.8);
    const estimatedMax = Math.floor(baseSize * multiplier * 1.2);
    
    const audience = new SavedAudience({
      user: req.user._id,
      name,
      description: description || '',
      demographics: {
        ageMin: demographics?.ageMin || 18,
        ageMax: demographics?.ageMax || 65,
        gender: demographics?.gender || 'all'
      },
      interests: interests || [],
      locations: locations || [],
      languages: languages || [],
      estimatedSize: {
        min: estimatedMin,
        max: estimatedMax
      }
    });
    
    await audience.save();
    res.json({ success: true, audience, message: 'Audience saved successfully!' });
  } catch (error) {
    console.error('Error creating audience:', error);
    res.status(500).json({ success: false, message: 'Failed to create audience' });
  }
});

// Update audience
router.put('/audiences/:id', authMiddleware, async (req, res) => {
  try {
    const audience = await SavedAudience.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body },
      { new: true }
    );
    
    if (!audience) {
      return res.status(404).json({ success: false, message: 'Audience not found' });
    }
    
    res.json({ success: true, audience });
  } catch (error) {
    console.error('Error updating audience:', error);
    res.status(500).json({ success: false, message: 'Failed to update audience' });
  }
});

// Delete audience
router.delete('/audiences/:id', authMiddleware, async (req, res) => {
  try {
    const audience = await SavedAudience.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    
    if (!audience) {
      return res.status(404).json({ success: false, message: 'Audience not found' });
    }
    
    res.json({ success: true, message: 'Audience deleted' });
  } catch (error) {
    console.error('Error deleting audience:', error);
    res.status(500).json({ success: false, message: 'Failed to delete audience' });
  }
});

// ==================== PRODUCT CATALOG ====================

// Get all products
router.get('/products', authMiddleware, async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const query = { seller: req.user._id };
    
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    
    // Get categories for this user
    const categories = await Product.distinct('category', { seller: req.user._id });
    
    // Transform products to match frontend expectations
    const transformedProducts = products.map(p => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      price: p.price,
      comparePrice: p.originalPrice,
      category: p.category,
      stock: p.stock,
      images: p.images?.map(url => ({ url, alt: p.name })) || [],
      status: p.isActive ? 'active' : 'inactive',
      views: p.views || 0,
      sales: p.purchases || 0,
      tags: p.tags,
      createdAt: p.createdAt
    }));
    
    res.json({ 
      success: true, 
      products: transformedProducts,
      categories: categories.filter(c => c),
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/products/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
});

// Create product
router.post('/products', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, comparePrice, category, stock, images, tags } = req.body;
    
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }
    
    const product = new Product({
      seller: req.user._id,
      name,
      description: description || '',
      price: parseFloat(price),
      originalPrice: comparePrice ? parseFloat(comparePrice) : undefined,
      category: category || 'General',
      stock: parseInt(stock) || 0,
      images: images?.map(img => img.url || img) || [],
      tags: tags || [],
      isActive: true,
      productLink: `https://shop.example.com/product/${Date.now()}` // Auto-generate product link
    });
    
    await product.save();
    
    // Transform for frontend
    const transformedProduct = {
      _id: product._id,
      name: product.name,
      description: product.description,
      price: product.price,
      comparePrice: product.originalPrice,
      category: product.category,
      stock: product.stock,
      images: product.images?.map(url => ({ url, alt: product.name })) || [],
      status: product.isActive ? 'active' : 'inactive',
      views: 0,
      sales: 0,
      tags: product.tags,
      createdAt: product.createdAt
    };
    
    res.json({ success: true, product: transformedProduct, message: 'Product added successfully!' });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// Update product
router.put('/products/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, comparePrice, category, stock, images, tags, status } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (comparePrice !== undefined) updateData.originalPrice = comparePrice ? parseFloat(comparePrice) : null;
    if (category) updateData.category = category;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (images) updateData.images = images.map(img => img.url || img);
    if (tags) updateData.tags = tags;
    if (status !== undefined) updateData.isActive = status === 'active';
    
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, seller: req.user._id },
      { $set: updateData },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    // Transform for frontend
    const transformedProduct = {
      _id: product._id,
      name: product.name,
      description: product.description,
      price: product.price,
      comparePrice: product.originalPrice,
      category: product.category,
      stock: product.stock,
      images: product.images?.map(url => ({ url, alt: product.name })) || [],
      status: product.isActive ? 'active' : 'inactive',
      views: product.views || 0,
      sales: product.purchases || 0,
      tags: product.tags,
      createdAt: product.createdAt
    };
    
    res.json({ success: true, product: transformedProduct, message: 'Product updated!' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// Toggle product status
router.put('/products/:id/status', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    product.isActive = !product.isActive;
    await product.save();
    
    // Transform for frontend
    const transformedProduct = {
      _id: product._id,
      name: product.name,
      description: product.description,
      price: product.price,
      comparePrice: product.originalPrice,
      category: product.category,
      stock: product.stock,
      images: product.images?.map(url => ({ url, alt: product.name })) || [],
      status: product.isActive ? 'active' : 'inactive',
      views: product.views || 0,
      sales: product.purchases || 0,
      tags: product.tags,
      createdAt: product.createdAt
    };
    
    res.json({ success: true, product: transformedProduct, message: `Product ${product.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('Error toggling product status:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// Delete product
router.delete('/products/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, seller: req.user._id });
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// Get product categories
router.get('/product-categories', authMiddleware, async (req, res) => {
  try {
    const defaultCategories = ['Electronics', 'Fashion', 'Home & Garden', 'Beauty', 'Sports', 'Toys', 'Books', 'Food', 'Other'];
    const userCategories = await Product.distinct('category', { seller: req.user._id });
    
    // Merge and deduplicate
    const allCategories = [...new Set([...defaultCategories, ...userCategories.filter(c => c)])];
    
    res.json({ success: true, categories: allCategories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// ==================== BRAND PARTNERSHIPS ====================

// Get all partnerships
router.get('/partnerships', authMiddleware, async (req, res) => {
  try {
    const partnerships = await BrandPartnership.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, partnerships });
  } catch (error) {
    console.error('Error fetching partnerships:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch partnerships' });
  }
});

// Create partnership application
router.post('/partnerships', authMiddleware, async (req, res) => {
  try {
    const { brandName, contactEmail, campaignType, budget, description, deliverables } = req.body;
    
    if (!brandName) {
      return res.status(400).json({ success: false, message: 'Brand name is required' });
    }
    
    const partnership = new BrandPartnership({
      user: req.user._id,
      brandName,
      contactEmail: contactEmail || '',
      campaignType: campaignType || 'sponsored_post',
      budget: parseFloat(budget) || 0,
      description: description || '',
      deliverables: deliverables || '',
      status: 'pending'
    });
    
    await partnership.save();
    res.json({ success: true, partnership, message: 'Partnership application submitted!' });
  } catch (error) {
    console.error('Error creating partnership:', error);
    res.status(500).json({ success: false, message: 'Failed to submit application' });
  }
});

// Update partnership status
router.put('/partnerships/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const partnership = await BrandPartnership.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { status } },
      { new: true }
    );
    
    if (!partnership) {
      return res.status(404).json({ success: false, message: 'Partnership not found' });
    }
    
    res.json({ success: true, partnership });
  } catch (error) {
    console.error('Error updating partnership:', error);
    res.status(500).json({ success: false, message: 'Failed to update' });
  }
});

// Delete/Cancel partnership
router.delete('/partnerships/:id', authMiddleware, async (req, res) => {
  try {
    const partnership = await BrandPartnership.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user._id,
      status: 'pending' // Can only delete pending ones
    });
    
    if (!partnership) {
      return res.status(404).json({ success: false, message: 'Partnership not found or cannot be deleted' });
    }
    
    res.json({ success: true, message: 'Partnership application cancelled' });
  } catch (error) {
    console.error('Error deleting partnership:', error);
    res.status(500).json({ success: false, message: 'Failed to delete' });
  }
});

// ==================== BUSINESS MESSAGING ====================

// Search users to start conversation
router.get('/search-users', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, users: [] });
    }
    
    const User = require('../models/User');
    const users = await User.find({
      _id: { $ne: req.user._id }, // Exclude current user
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
    .select('username email profilePicture')
    .limit(10);
    
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ success: false, message: 'Failed to search users' });
  }
});

// Start new conversation with a user
router.post('/conversations/new', authMiddleware, async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    const User = require('../models/User');
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if conversation already exists
    let conversation = await BusinessConversation.findOne({
      $or: [
        { business: req.user._id, customer: userId },
        { business: userId, customer: req.user._id }
      ]
    });
    
    if (conversation) {
      // Add message to existing conversation
      if (message) {
        conversation.messages.push({
          sender: 'business',
          text: message,
          timestamp: new Date(),
          read: false
        });
        conversation.lastMessage = {
          text: message,
          sender: 'business',
          timestamp: new Date()
        };
        await conversation.save();
      }
      return res.json({ success: true, conversation, isNew: false });
    }
    
    // Create new conversation
    conversation = new BusinessConversation({
      business: req.user._id,
      customer: userId,
      customerInfo: {
        name: targetUser.username,
        username: `@${targetUser.username}`,
        avatar: targetUser.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.username}`
      },
      status: 'active',
      unreadCount: 0,
      messages: message ? [{
        sender: 'business',
        text: message,
        timestamp: new Date(),
        read: false
      }] : [],
      lastMessage: message ? {
        text: message,
        sender: 'business',
        timestamp: new Date()
      } : null
    });
    
    await conversation.save();
    res.json({ success: true, conversation, isNew: true, message: 'Conversation started!' });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ success: false, message: 'Failed to create conversation' });
  }
});

// Get all conversations
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { business: req.user._id };
    
    if (status && status !== 'all') {
      if (status === 'inbox') {
        query.$or = [
          { status: 'active' },
          { status: 'pending' },
          { unreadCount: { $gt: 0 } }
        ];
      } else {
        query.status = status;
      }
    }
    
    const conversations = await BusinessConversation.find(query)
      .sort({ 'lastMessage.timestamp': -1 })
      .populate('customer', 'username profilePicture');
    
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
});

// Get single conversation with messages
router.get('/conversations/:id', authMiddleware, async (req, res) => {
  try {
    const conversation = await BusinessConversation.findOne({
      _id: req.params.id,
      business: req.user._id
    }).populate('customer', 'username profilePicture');
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    // Mark messages as read
    conversation.messages.forEach(msg => {
      if (msg.sender === 'customer') msg.read = true;
    });
    conversation.unreadCount = 0;
    await conversation.save();
    
    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
  }
});

// Send message in conversation
router.post('/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }
    
    const conversation = await BusinessConversation.findOne({
      _id: req.params.id,
      business: req.user._id
    });
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    const newMessage = {
      sender: 'business',
      text: text.trim(),
      timestamp: new Date(),
      read: true
    };
    
    conversation.messages.push(newMessage);
    conversation.lastMessage = {
      text: text.trim(),
      sender: 'business',
      timestamp: new Date()
    };
    conversation.status = 'active';
    
    await conversation.save();
    
    res.json({ 
      success: true, 
      message: newMessage,
      conversation 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Mark conversation as resolved
router.put('/conversations/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const conversation = await BusinessConversation.findOneAndUpdate(
      { _id: req.params.id, business: req.user._id },
      { $set: { status: 'resolved', unreadCount: 0 } },
      { new: true }
    );
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    res.json({ success: true, conversation, message: 'Conversation marked as resolved' });
  } catch (error) {
    console.error('Error resolving conversation:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve conversation' });
  }
});

// Delete/Archive conversation
router.delete('/conversations/:id', authMiddleware, async (req, res) => {
  try {
    const conversation = await BusinessConversation.findOneAndUpdate(
      { _id: req.params.id, business: req.user._id },
      { $set: { status: 'archived' } },
      { new: true }
    );
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    res.json({ success: true, message: 'Conversation archived' });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({ success: false, message: 'Failed to archive conversation' });
  }
});

// Get unread count
router.get('/conversations/stats/unread', authMiddleware, async (req, res) => {
  try {
    const unreadCount = await BusinessConversation.countDocuments({
      business: req.user._id,
      unreadCount: { $gt: 0 }
    });
    
    const totalUnread = await BusinessConversation.aggregate([
      { $match: { business: req.user._id } },
      { $group: { _id: null, total: { $sum: '$unreadCount' } } }
    ]);
    
    res.json({ 
      success: true, 
      unreadConversations: unreadCount,
      totalUnreadMessages: totalUnread[0]?.total || 0
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
});

// ==================== MESSAGING SETTINGS ====================

// Get messaging settings
router.get('/messaging-settings', authMiddleware, async (req, res) => {
  try {
    let profile = await BusinessProfile.findOne({ user: req.user._id });
    
    if (!profile) {
      profile = new BusinessProfile({ user: req.user._id });
      await profile.save();
    }
    
    res.json({ 
      success: true, 
      settings: profile.messagingSettings || {
        notifications: true,
        autoReply: false,
        autoReplyMessage: '',
        aiAssistant: true,
        messageFiltering: true
      }
    });
  } catch (error) {
    console.error('Error fetching messaging settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// Update messaging settings
router.put('/messaging-settings', authMiddleware, async (req, res) => {
  try {
    const { notifications, autoReply, autoReplyMessage, aiAssistant, messageFiltering } = req.body;
    
    const profile = await BusinessProfile.findOneAndUpdate(
      { user: req.user._id },
      { 
        $set: { 
          'messagingSettings.notifications': notifications,
          'messagingSettings.autoReply': autoReply,
          'messagingSettings.autoReplyMessage': autoReplyMessage || '',
          'messagingSettings.aiAssistant': aiAssistant,
          'messagingSettings.messageFiltering': messageFiltering,
          messagingEnabled: true
        }
      },
      { new: true, upsert: true }
    );
    
    res.json({ 
      success: true, 
      settings: profile.messagingSettings,
      message: 'Settings saved!'
    });
  } catch (error) {
    console.error('Error updating messaging settings:', error);
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

// ==================== QUICK REPLIES ====================

// Get all quick replies
router.get('/quick-replies', authMiddleware, async (req, res) => {
  try {
    const quickReplies = await QuickReply.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, quickReplies });
  } catch (error) {
    console.error('Error fetching quick replies:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quick replies' });
  }
});

// Create quick reply
router.post('/quick-replies', authMiddleware, async (req, res) => {
  try {
    const { title, message } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }
    
    const quickReply = new QuickReply({
      user: req.user._id,
      title: title.trim(),
      message: message.trim()
    });
    
    await quickReply.save();
    res.json({ success: true, quickReply, message: 'Quick reply created!' });
  } catch (error) {
    console.error('Error creating quick reply:', error);
    res.status(500).json({ success: false, message: 'Failed to create quick reply' });
  }
});

// Update quick reply
router.put('/quick-replies/:id', authMiddleware, async (req, res) => {
  try {
    const { title, message } = req.body;
    
    const quickReply = await QuickReply.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { title, message } },
      { new: true }
    );
    
    if (!quickReply) {
      return res.status(404).json({ success: false, message: 'Quick reply not found' });
    }
    
    res.json({ success: true, quickReply, message: 'Quick reply updated!' });
  } catch (error) {
    console.error('Error updating quick reply:', error);
    res.status(500).json({ success: false, message: 'Failed to update quick reply' });
  }
});

// Delete quick reply
router.delete('/quick-replies/:id', authMiddleware, async (req, res) => {
  try {
    const quickReply = await QuickReply.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!quickReply) {
      return res.status(404).json({ success: false, message: 'Quick reply not found' });
    }
    
    res.json({ success: true, message: 'Quick reply deleted' });
  } catch (error) {
    console.error('Error deleting quick reply:', error);
    res.status(500).json({ success: false, message: 'Failed to delete quick reply' });
  }
});

// Create demo conversation (for testing)
router.post('/conversations/demo', authMiddleware, async (req, res) => {
  try {
    // Check if demo conversations already exist
    const existing = await BusinessConversation.countDocuments({ business: req.user._id });
    
    if (existing > 0) {
      return res.json({ success: true, message: 'Demo conversations already exist' });
    }
    
    // Create demo conversations
    const demoConversations = [
      {
        business: req.user._id,
        customer: req.user._id, // Self for demo
        customerInfo: {
          name: 'John Doe',
          username: '@johndoe',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john'
        },
        lastMessage: {
          text: 'Hi, I\'m interested in your product',
          sender: 'customer',
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        },
        status: 'active',
        unreadCount: 2,
        messages: [
          { sender: 'customer', text: 'Hi, I\'m interested in your product', timestamp: new Date(Date.now() - 10 * 60 * 1000), read: false },
          { sender: 'customer', text: 'Is it still available?', timestamp: new Date(Date.now() - 5 * 60 * 1000), read: false }
        ]
      },
      {
        business: req.user._id,
        customer: req.user._id,
        customerInfo: {
          name: 'Sarah Smith',
          username: '@sarahsmith',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah'
        },
        lastMessage: {
          text: 'Thank you for the quick response!',
          sender: 'customer',
          timestamp: new Date(Date.now() - 30 * 60 * 1000)
        },
        status: 'resolved',
        unreadCount: 0,
        messages: [
          { sender: 'customer', text: 'Do you offer international shipping?', timestamp: new Date(Date.now() - 60 * 60 * 1000), read: true },
          { sender: 'business', text: 'Yes, we ship worldwide!', timestamp: new Date(Date.now() - 45 * 60 * 1000), read: true },
          { sender: 'customer', text: 'Thank you for the quick response!', timestamp: new Date(Date.now() - 30 * 60 * 1000), read: true }
        ]
      },
      {
        business: req.user._id,
        customer: req.user._id,
        customerInfo: {
          name: 'Mike Johnson',
          username: '@mikej',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike'
        },
        lastMessage: {
          text: 'Can I get a discount for bulk orders?',
          sender: 'customer',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        status: 'pending',
        unreadCount: 1,
        messages: [
          { sender: 'customer', text: 'Can I get a discount for bulk orders?', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), read: false }
        ]
      }
    ];
    
    await BusinessConversation.insertMany(demoConversations);
    
    // Update messaging enabled in business profile
    await BusinessProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: { messagingEnabled: true, unreadMessages: 3 } },
      { upsert: true }
    );
    
    res.json({ success: true, message: 'Demo conversations created!' });
  } catch (error) {
    console.error('Error creating demo conversations:', error);
    res.status(500).json({ success: false, message: 'Failed to create demo conversations' });
  }
});

// ==================== EXPORT REPORTS ====================

// Export campaigns as CSV
router.get('/export/csv', authMiddleware, async (req, res) => {
  try {
    const campaigns = await AdCampaign.find({ user: req.user._id });
    
    // Create CSV header
    let csv = 'Campaign Name,Objective,Status,Budget,Spent,Impressions,Clicks,CTR,Conversions,Created Date\n';
    
    // Add data rows
    campaigns.forEach(c => {
      const ctr = c.performance.impressions > 0 
        ? ((c.performance.clicks / c.performance.impressions) * 100).toFixed(2) 
        : '0.00';
      csv += `"${c.name}","${c.objective}","${c.status}","$${c.budget}","$${c.spent || 0}","${c.performance.impressions}","${c.performance.clicks}","${ctr}%","${c.performance.conversions}","${new Date(c.createdAt).toLocaleDateString()}"\n`;
    });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=campaigns_report_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ success: false, message: 'Failed to export CSV' });
  }
});

// Export as JSON (for Excel)
router.get('/export/excel', authMiddleware, async (req, res) => {
  try {
    const campaigns = await AdCampaign.find({ user: req.user._id });
    const profile = await BusinessProfile.findOne({ user: req.user._id });
    
    const data = {
      businessInfo: {
        name: profile?.businessName || 'N/A',
        type: profile?.businessType || 'N/A',
        exportDate: new Date().toISOString()
      },
      summary: {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        totalBudget: campaigns.reduce((sum, c) => sum + c.budget, 0),
        totalSpent: campaigns.reduce((sum, c) => sum + (c.spent || 0), 0),
        totalImpressions: campaigns.reduce((sum, c) => sum + c.performance.impressions, 0),
        totalClicks: campaigns.reduce((sum, c) => sum + c.performance.clicks, 0),
        totalConversions: campaigns.reduce((sum, c) => sum + c.performance.conversions, 0)
      },
      campaigns: campaigns.map(c => ({
        name: c.name,
        objective: c.objective,
        status: c.status,
        budget: c.budget,
        spent: c.spent || 0,
        impressions: c.performance.impressions,
        clicks: c.performance.clicks,
        ctr: c.performance.impressions > 0 
          ? ((c.performance.clicks / c.performance.impressions) * 100).toFixed(2) + '%'
          : '0.00%',
        conversions: c.performance.conversions,
        startDate: c.startDate,
        endDate: c.endDate,
        createdAt: c.createdAt
      }))
    };
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=campaigns_report_${Date.now()}.json`);
    res.json(data);
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({ success: false, message: 'Failed to export' });
  }
});

// Export as PDF data
router.get('/export/pdf', authMiddleware, async (req, res) => {
  try {
    const campaigns = await AdCampaign.find({ user: req.user._id });
    const profile = await BusinessProfile.findOne({ user: req.user._id });
    
    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ad Campaign Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    h1 { color: #FF0050; border-bottom: 2px solid #FF0050; padding-bottom: 10px; }
    h2 { color: #1F2937; margin-top: 30px; }
    .summary { background: #F8FAFC; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
    .summary-item { text-align: center; }
    .summary-value { font-size: 24px; font-weight: bold; color: #FF0050; }
    .summary-label { font-size: 12px; color: #6B7280; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #FF0050; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #E5E7EB; }
    tr:nth-child(even) { background: #F9FAFB; }
    .footer { margin-top: 40px; text-align: center; color: #6B7280; font-size: 12px; }
  </style>
</head>
<body>
  <h1>📊 Ad Campaign Report</h1>
  <p><strong>Business:</strong> ${profile?.businessName || 'N/A'}</p>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  
  <div class="summary">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-value">${campaigns.length}</div>
        <div class="summary-label">Total Campaigns</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">$${campaigns.reduce((sum, c) => sum + c.budget, 0).toLocaleString()}</div>
        <div class="summary-label">Total Budget</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${campaigns.reduce((sum, c) => sum + c.performance.impressions, 0).toLocaleString()}</div>
        <div class="summary-label">Total Impressions</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${campaigns.reduce((sum, c) => sum + c.performance.clicks, 0).toLocaleString()}</div>
        <div class="summary-label">Total Clicks</div>
      </div>
    </div>
  </div>
  
  <h2>Campaign Details</h2>
  <table>
    <thead>
      <tr>
        <th>Campaign</th>
        <th>Status</th>
        <th>Budget</th>
        <th>Impressions</th>
        <th>Clicks</th>
        <th>CTR</th>
      </tr>
    </thead>
    <tbody>
      ${campaigns.map(c => `
        <tr>
          <td><strong>${c.name}</strong><br><small>${c.objective}</small></td>
          <td>${c.status}</td>
          <td>$${c.budget.toLocaleString()}</td>
          <td>${c.performance.impressions.toLocaleString()}</td>
          <td>${c.performance.clicks.toLocaleString()}</td>
          <td>${c.performance.impressions > 0 ? ((c.performance.clicks / c.performance.impressions) * 100).toFixed(2) : '0.00'}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Generated by TikTok Clone Ad Manager</p>
  </div>
</body>
</html>`;
    
    // Set headers for HTML download (user can print to PDF)
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename=campaigns_report_${Date.now()}.html`);
    res.send(html);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ success: false, message: 'Failed to export' });
  }
});

module.exports = router;


