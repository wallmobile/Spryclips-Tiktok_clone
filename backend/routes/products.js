const express = require('express');
const Product = require('../models/Product');
const Video = require('../models/Video');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get all products (with filters)
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    
    if (category) query.category = category;
    if (featured === 'true') query.featured = true;
    if (search) {
      query.$text = { $search: search };
    }
    
    const products = await Product.find(query)
      .populate('seller', 'username profile')
      .sort(featured === 'true' ? { featured: -1, createdAt: -1 } : { createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Product.countDocuments(query);
    
    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get featured products
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, featured: true })
      .populate('seller', 'username profile')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'username profile');
    
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Increment views
    product.views++;
    await product.save();
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create product (seller only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const productData = {
      ...req.body,
      seller: req.user._id
    };
    
    const product = new Product(productData);
    await product.save();
    
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update product (seller only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product || product.seller.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }
    
    Object.assign(product, req.body);
    await product.save();
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Tag product in video
router.post('/tag-video', authMiddleware, async (req, res) => {
  try {
    const { videoId, productId, timestamp, position } = req.body;
    const video = await Video.findById(videoId);
    
    if (!video || video.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Video not found or unauthorized' });
    }
    
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    video.products.push({
      product: productId,
      timestamp: timestamp || 0,
      position: position || { x: 0, y: 0 }
    });
    
    await video.save();
    res.json(video);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Track product click
router.post('/:id/click', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      product.clicks++;
      await product.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Track product purchase (in-app purchase)
router.post('/:id/purchase', authMiddleware, async (req, res) => {
  try {
    const { quantity = 1 } = req.body;
    const product = await Product.findById(req.params.id);
    
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }
    
    // In a real app, you would process payment here
    // For now, just update stats
    product.purchases += quantity;
    product.stock -= quantity;
    await product.save();
    
    res.json({
      success: true,
      message: 'Purchase successful',
      product
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const products = await Product.find({
      category: req.params.category,
      isActive: true
    })
      .populate('seller', 'username profile')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Product.countDocuments({
      category: req.params.category,
      isActive: true
    });
    
    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
