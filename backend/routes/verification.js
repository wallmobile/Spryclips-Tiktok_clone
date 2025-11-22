const express = require('express');
const Verification = require('../models/Verification');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for document uploads
const verificationUploadDir = path.join(__dirname, '../uploads/verification');
if (!fs.existsSync(verificationUploadDir)) {
  fs.mkdirSync(verificationUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, verificationUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'verification-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed!'));
    }
  }
});

// ==================== REQUEST VERIFICATION ====================
router.post('/request', authMiddleware, upload.array('documents', 5), async (req, res) => {
  try {
    const userId = req.user._id;
    const { fullName, category, website, description } = req.body;

    // Check if user already has a verification request
    const existingVerification = await Verification.findOne({ user: userId });

    if (existingVerification && existingVerification.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending verification request',
      });
    }

    if (existingVerification && existingVerification.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Your account is already verified',
      });
    }

    // Check if documents are uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one document is required',
      });
    }

    // Prepare documents
    const documents = req.files.map((file, index) => ({
      type: req.body[`documentType_${index}`] || 'id',
      url: `/uploads/verification/${file.filename}`,
      uploadedAt: new Date(),
    }));

    // Create verification request
    const verification = new Verification({
      user: userId,
      status: 'pending',
      documents,
      additionalInfo: {
        fullName: fullName || req.user.profile.displayName || req.user.username,
        category: category || 'individual',
        website: website || '',
        description: description || '',
      },
    });

    await verification.save();
    await verification.populate('user', 'username profile');

    res.status(201).json({
      success: true,
      verification,
      message: 'Verification request submitted successfully',
    });
  } catch (error) {
    console.error('Error requesting verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit verification request',
      error: error.message,
    });
  }
});

// ==================== GET VERIFICATION STATUS ====================
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const verification = await Verification.findOne({ user: userId })
      .populate('user', 'username profile')
      .populate('reviewedBy', 'username');

    if (!verification) {
      return res.json({
        success: true,
        status: 'not_requested',
        message: 'No verification request found',
      });
    }

    res.json({
      success: true,
      verification,
      status: verification.status,
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification status',
      error: error.message,
    });
  }
});

// ==================== GET PENDING VERIFICATIONS (Admin) ====================
const { adminMiddleware } = require('../middleware/admin');
router.get('/pending', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const pendingVerifications = await Verification.find({ status: 'pending' })
      .populate('user', 'username profile')
      .sort({ requestedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      verifications: pendingVerifications,
      count: pendingVerifications.length,
    });
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending verifications',
      error: error.message,
    });
  }
});

// ==================== APPROVE VERIFICATION (Admin) ====================
router.post('/:verificationId/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const verificationId = req.params.verificationId;
    const reviewerId = req.user._id;
    const { notes } = req.body;
    
    const verification = await Verification.findById(verificationId);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found',
      });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Verification request is not pending',
      });
    }

    // Update verification status
    verification.status = 'approved';
    verification.reviewedAt = new Date();
    verification.reviewedBy = reviewerId;
    if (notes) {
      verification.notes = notes;
    }

    await verification.save();

    // Update user verification status
    const user = await User.findById(verification.user);
    if (user) {
      user.profile.isVerified = true;
      await user.save();
    }

    await verification.populate('user', 'username profile');
    await verification.populate('reviewedBy', 'username');

    res.json({
      success: true,
      verification,
      message: 'Verification approved successfully',
    });
  } catch (error) {
    console.error('Error approving verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve verification',
      error: error.message,
    });
  }
});

// ==================== REJECT VERIFICATION (Admin) ====================
router.post('/:verificationId/reject', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const verificationId = req.params.verificationId;
    const reviewerId = req.user._id;
    const { rejectionReason, notes } = req.body;
    
    const verification = await Verification.findById(verificationId);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found',
      });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Verification request is not pending',
      });
    }

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    // Update verification status
    verification.status = 'rejected';
    verification.reviewedAt = new Date();
    verification.reviewedBy = reviewerId;
    verification.rejectionReason = rejectionReason;
    if (notes) {
      verification.notes = notes;
    }

    await verification.save();

    // Update user verification status (if it was previously approved)
    const user = await User.findById(verification.user);
    if (user && user.profile.isVerified) {
      user.profile.isVerified = false;
      await user.save();
    }

    await verification.populate('user', 'username profile');
    await verification.populate('reviewedBy', 'username');

    res.json({
      success: true,
      verification,
      message: 'Verification rejected',
    });
  } catch (error) {
    console.error('Error rejecting verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject verification',
      error: error.message,
    });
  }
});

// ==================== GET VERIFICATION DETAILS ====================
router.get('/:verificationId', authMiddleware, async (req, res) => {
  try {
    const verificationId = req.params.verificationId;
    const userId = req.user._id;

    const verification = await Verification.findById(verificationId)
      .populate('user', 'username profile')
      .populate('reviewedBy', 'username');

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found',
      });
    }

    // Check if user owns this verification or is admin
    if (verification.user._id.toString() !== userId.toString()) {
      // In production, add admin check here
      // For now, allow viewing
    }

    res.json({
      success: true,
      verification,
    });
  } catch (error) {
    console.error('Error fetching verification details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification details',
      error: error.message,
    });
  }
});

module.exports = router;

