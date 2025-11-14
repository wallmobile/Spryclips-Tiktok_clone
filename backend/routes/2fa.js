const express = require('express');
const TwoFactorAuth = require('../models/TwoFactorAuth');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const router = express.Router();

// ==================== GENERATE 2FA SECRET ====================
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if 2FA already enabled
    const existing2FA = await TwoFactorAuth.findOne({ user: userId });
    if (existing2FA && existing2FA.enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled for this account',
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${req.user.username} (TikTok Clone)`,
      length: 32,
    });

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push({
        code: crypto.randomBytes(4).toString('hex').toUpperCase(),
        used: false,
      });
    }

    // Save or update 2FA (not enabled yet)
    if (existing2FA) {
      existing2FA.secret = secret.base32;
      existing2FA.backupCodes = backupCodes;
      existing2FA.enabled = false;
      await existing2FA.save();
    } else {
      const twoFactorAuth = new TwoFactorAuth({
        user: userId,
        secret: secret.base32,
        backupCodes,
        enabled: false,
      });
      await twoFactorAuth.save();
    }

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: backupCodes.map(bc => bc.code),
      message: '2FA secret generated. Verify with a code to enable.',
    });
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate 2FA secret',
      error: error.message,
    });
  }
});

// ==================== VERIFY AND ENABLE 2FA ====================
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { token, backupCode } = req.body;

    if (!token && !backupCode) {
      return res.status(400).json({
        success: false,
        message: 'Token or backup code is required',
      });
    }

    const twoFactorAuth = await TwoFactorAuth.findOne({ user: userId });

    if (!twoFactorAuth) {
      return res.status(404).json({
        success: false,
        message: '2FA not set up. Please generate a secret first.',
      });
    }

    let verified = false;

    if (token) {
      // Verify TOTP token
      verified = speakeasy.totp.verify({
        secret: twoFactorAuth.secret,
        encoding: 'base32',
        token: token,
        window: 2, // Allow 2 time steps before/after
      });
    } else if (backupCode) {
      // Verify backup code
      const backupCodeIndex = twoFactorAuth.backupCodes.findIndex(
        bc => bc.code === backupCode.toUpperCase() && !bc.used
      );

      if (backupCodeIndex !== -1) {
        verified = true;
        twoFactorAuth.backupCodes[backupCodeIndex].used = true;
        twoFactorAuth.backupCodes[backupCodeIndex].usedAt = new Date();
        await twoFactorAuth.save();
      }
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token or backup code',
      });
    }

    // Enable 2FA
    twoFactorAuth.enabled = true;
    twoFactorAuth.lastUsed = new Date();
    await twoFactorAuth.save();

    res.json({
      success: true,
      message: '2FA enabled successfully',
    });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify 2FA',
      error: error.message,
    });
  }
});

// ==================== DISABLE 2FA ====================
router.post('/disable', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { token, backupCode, password } = req.body;

    const twoFactorAuth = await TwoFactorAuth.findOne({ user: userId });

    if (!twoFactorAuth || !twoFactorAuth.enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled',
      });
    }

    // Verify password
    if (password) {
      const user = await User.findById(userId);
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid password',
        });
      }
    }

    // Verify token or backup code
    let verified = false;

    if (token) {
      verified = speakeasy.totp.verify({
        secret: twoFactorAuth.secret,
        encoding: 'base32',
        token: token,
        window: 2,
      });
    } else if (backupCode) {
      const backupCodeIndex = twoFactorAuth.backupCodes.findIndex(
        bc => bc.code === backupCode.toUpperCase() && !bc.used
      );

      if (backupCodeIndex !== -1) {
        verified = true;
        twoFactorAuth.backupCodes[backupCodeIndex].used = true;
        twoFactorAuth.backupCodes[backupCodeIndex].usedAt = new Date();
      }
    }

    if (!verified && !password) {
      return res.status(400).json({
        success: false,
        message: 'Token, backup code, or password is required',
      });
    }

    // Disable 2FA
    twoFactorAuth.enabled = false;
    await twoFactorAuth.save();

    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA',
      error: error.message,
    });
  }
});

// ==================== GET 2FA STATUS ====================
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const twoFactorAuth = await TwoFactorAuth.findOne({ user: userId });

    if (!twoFactorAuth) {
      return res.json({
        success: true,
        enabled: false,
        message: '2FA is not set up',
      });
    }

    // Count unused backup codes
    const unusedBackupCodes = twoFactorAuth.backupCodes.filter(bc => !bc.used).length;

    res.json({
      success: true,
      enabled: twoFactorAuth.enabled,
      hasBackupCodes: unusedBackupCodes > 0,
      unusedBackupCodesCount: unusedBackupCodes,
      lastUsed: twoFactorAuth.lastUsed,
    });
  } catch (error) {
    console.error('Error fetching 2FA status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch 2FA status',
      error: error.message,
    });
  }
});

// ==================== REGENERATE BACKUP CODES ====================
router.post('/regenerate-backup-codes', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    const twoFactorAuth = await TwoFactorAuth.findOne({ user: userId });

    if (!twoFactorAuth || !twoFactorAuth.enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled',
      });
    }

    // Verify password
    if (password) {
      const user = await User.findById(userId);
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid password',
        });
      }
    }

    // Generate new backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push({
        code: crypto.randomBytes(4).toString('hex').toUpperCase(),
        used: false,
      });
    }

    twoFactorAuth.backupCodes = backupCodes;
    await twoFactorAuth.save();

    res.json({
      success: true,
      backupCodes: backupCodes.map(bc => bc.code),
      message: 'Backup codes regenerated successfully',
    });
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate backup codes',
      error: error.message,
    });
  }
});

module.exports = router;

