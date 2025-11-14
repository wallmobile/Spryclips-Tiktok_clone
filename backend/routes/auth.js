const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const RefreshToken = require('../models/RefreshToken');
const authMiddleware = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../utils/rateLimiter');
const { sendEmail, emailTemplates } = require('../utils/emailService');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { asyncHandler, AppError } = require('../utils/errorHandler');

// Generate JWT access token (15 minutes)
const generateAccessToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '15m' // 15 minutes
  });
};

// Generate refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Password validation regex - allows common special characters including #
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

const sanitizeUsername = (value = '') => value.toLowerCase().replace(/[^a-z0-9_]/g, '');

const generateUniqueUsername = async (base) => {
  const sanitized = sanitizeUsername(base) || `user${Date.now()}`;
  let attempt = sanitized;
  let counter = 1;

  // Ensure we don't loop forever
  // eslint-disable-next-line no-constant-condition
  while (await User.exists({ username: attempt })) {
    attempt = `${sanitized}${counter}`;
    counter += 1;
    if (counter > 9999) {
      attempt = `${sanitized}${Date.now()}`;
      break;
    }
  }
  return attempt;
};

const buildUserResponse = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  profile: user.profile,
  role: user.role,
  emailVerified: user.emailVerified
});

const issueAuthSuccess = async ({
  user,
  req,
  res,
  statusCode = 200,
  extra = {}
}) => {
  const accessToken = generateAccessToken(user._id);
  const refreshTokenValue = generateRefreshToken();

  const refreshToken = new RefreshToken({
    user: user._id,
    token: refreshTokenValue,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
  await refreshToken.save();

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });

  res.cookie('refreshToken', refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(statusCode).json({
    success: true,
    user: buildUserResponse(user),
    token: accessToken,
    refreshToken: refreshTokenValue,
    tokens: {
      accessToken,
      refreshToken: refreshTokenValue
    },
    ...extra
  });
};

const upsertSocialUser = async ({ provider, providerId, email, displayName, avatar }) => {
  const normalizedEmail = (email || `${providerId}@${provider}.oauth`).toLowerCase();

  let user = await User.findOne({
    $or: [
      { providerId, authProvider: provider },
      { email: normalizedEmail }
    ]
  });

  if (user) {
    let shouldSave = false;
    if (!user.providerId || user.authProvider === 'local') {
      user.authProvider = provider;
      user.providerId = providerId;
      shouldSave = true;
    }
    if (!user.emailVerified) {
      user.emailVerified = true;
      shouldSave = true;
    }
    if (displayName && (!user.profile?.displayName || user.profile.displayName === user.username)) {
      user.profile.displayName = displayName;
      shouldSave = true;
    }
    if (avatar && !user.profile?.avatar) {
      user.profile.avatar = avatar;
      shouldSave = true;
    }
    if (shouldSave) {
      await user.save();
    }
    return user;
  }

  const usernameBase = displayName || normalizedEmail.split('@')[0] || `${provider}_user`;
  const username = await generateUniqueUsername(usernameBase);

  user = new User({
    username,
    email: normalizedEmail,
    authProvider: provider,
    providerId,
    emailVerified: true,
    profile: {
      displayName: displayName || username,
      avatar: avatar || ''
    }
  });

  await user.save();
  return user;
};

const verifyGoogleToken = async (accessToken) => {
  try {
    const tokenInfo = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
      params: { access_token: accessToken }
    });

    if (tokenInfo.data?.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw new AppError('Google token audience mismatch', 401);
    }

    const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return data;
  } catch (error) {
    const message = error?.response?.data?.error_description || error?.response?.data?.error || 'Failed to verify Google token';
    throw new AppError(message, 401);
  }
};

const verifyFacebookToken = async (accessToken) => {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new AppError('Facebook login not configured', 503);
  }

  try {
    const appAccessToken = `${appId}|${appSecret}`;

    const debugResponse = await axios.get('https://graph.facebook.com/debug_token', {
      params: {
        input_token: accessToken,
        access_token: appAccessToken
      }
    });

    if (!debugResponse.data?.data?.is_valid) {
      throw new AppError('Invalid Facebook token', 401);
    }

    const { data } = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email,picture.type(large)',
        access_token: accessToken
      }
    });

    return data;
  } catch (error) {
    const message = error?.response?.data?.error?.message || 'Failed to verify Facebook token';
    throw new AppError(message, 401);
  }
};

// Register
router.post('/register', 
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(passwordRegex)
      .withMessage('Password must contain uppercase, lowercase, number, and special character')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, true, errors.array());
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      throw new AppError('User with this email or username already exists', 400);
    }

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = new User({
      username,
      email,
      password,
      authProvider: 'local',
      emailVerificationToken,
      emailVerificationExpires,
      profile: {
        displayName: username
      }
    });

    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshTokenValue = generateRefreshToken();
    
    const refreshToken = new RefreshToken({
      user: user._id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    await refreshToken.save();

    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${emailVerificationToken}`;
    const emailTemplate = emailTemplates.welcome(username, verificationLink);
    await sendEmail(email, emailTemplate.subject, emailTemplate.html);

    await issueAuthSuccess({
      user,
      req,
      res,
      statusCode: 201,
      extra: {
        message: 'Account created successfully'
      }
    });
  })
);

// Login
router.post('/login', 
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, true, errors.array());
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid credentials', 400);
    }

    if (user.isLocked()) {
      throw new AppError('Account is temporarily locked due to too many failed login attempts. Please try again later.', 423);
    }

    if (user.accountStatus !== 'active') {
      throw new AppError('Account is suspended or banned', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      throw new AppError('Invalid credentials', 400);
    }

    await user.resetLoginAttempts();
    
    user.lastLogin = new Date();
    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshTokenValue = generateRefreshToken();
    
    const refreshToken = new RefreshToken({
      user: user._id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    await refreshToken.save();

    await issueAuthSuccess({
      user,
      req,
      res,
      extra: {
        message: 'Login successful'
      }
    });
  })
);

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  
  if (!refreshToken) {
    throw new AppError('Refresh token required', 401);
  }

  const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
  
  if (!tokenDoc || !tokenDoc.isValid()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const accessToken = generateAccessToken(tokenDoc.user);

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.json({
    success: true,
    accessToken
  });
}));

// Logout
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (refreshToken) {
    await RefreshToken.findOneAndUpdate(
      { token: refreshToken },
      { revoked: true, revokedAt: new Date() }
    );
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// OIDC Login (Hub App integration)
router.post('/oidc/login', asyncHandler(async (req, res) => {
  const { id_token, providerId } = req.body;
  
  if (!id_token || !providerId) {
    throw new AppError('id_token and providerId are required', 400);
  }

  const user = await User.findOne({ providerId, authProvider: 'oidc' });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const accessToken = generateAccessToken(user._id);
  const refreshTokenValue = generateRefreshToken();
  
  const refreshToken = new RefreshToken({
    user: user._id,
    token: refreshTokenValue,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
  await refreshToken.save();

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });

  res.cookie('refreshToken', refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      profile: user.profile
    },
    token: accessToken,
    refreshToken: refreshTokenValue,
    tokens: {
      accessToken,
      refreshToken: refreshTokenValue
    }
  });
}));

// ==================== SOCIAL AUTH ====================
router.post('/social/google', asyncHandler(async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    throw new AppError('Google access token is required', 400, true, 'Please try signing in with Google again.');
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new AppError('Google login is not configured on the server', 503, true, 'Google login is currently unavailable. Please contact support or use email/password login.');
  }

  try {
    const googleProfile = await verifyGoogleToken(accessToken);

    if (!googleProfile || !googleProfile.sub) {
      throw new AppError('Invalid Google token response', 401, true, 'Google authentication failed. Please try again.');
    }

    const user = await upsertSocialUser({
      provider: 'google',
      providerId: googleProfile.sub,
      email: googleProfile.email,
      displayName: googleProfile.name || googleProfile.given_name || googleProfile.email?.split('@')[0],
      avatar: googleProfile.picture
    });

    user.lastLogin = new Date();
    await user.save();

    await issueAuthSuccess({
      user,
      req,
      res,
      extra: {
        message: 'Google sign-in successful',
        provider: 'google'
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Google authentication failed', 401, true, error.message || 'Unable to verify Google account. Please try again.');
  }
}));

router.post('/social/facebook', asyncHandler(async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    throw new AppError('Facebook access token is required', 400, true, 'Please try signing in with Facebook again.');
  }

  try {
    const fbProfile = await verifyFacebookToken(accessToken);

    if (!fbProfile || !fbProfile.id) {
      throw new AppError('Invalid Facebook token response', 401, true, 'Facebook authentication failed. Please try again.');
    }

    const user = await upsertSocialUser({
      provider: 'facebook',
      providerId: fbProfile.id,
      email: fbProfile.email,
      displayName: fbProfile.name || fbProfile.email?.split('@')[0] || `facebook_${fbProfile.id}`,
      avatar: fbProfile.picture?.data?.url || fbProfile.picture
    });

    user.lastLogin = new Date();
    await user.save();

    await issueAuthSuccess({
      user,
      req,
      res,
      extra: {
        message: 'Facebook sign-in successful',
        provider: 'facebook'
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Facebook authentication failed', 401, true, error.message || 'Unable to verify Facebook account. Please try again.');
  }
}));

// Verify token
router.get('/verify', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      profile: req.user.profile,
      role: req.user.role,
      emailVerified: req.user.emailVerified
    }
  });
});

// ==================== FORGOT PASSWORD ====================
router.post('/forgot-password', passwordResetLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    });
  }

  const token = PasswordReset.generateToken();

  const passwordReset = new PasswordReset({
    user: user._id,
    token: token,
    expiresAt: new Date(Date.now() + 3600000) // 1 hour
  });

  await passwordReset.save();

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  const emailTemplate = emailTemplates.passwordReset(user.username, resetLink);
  await sendEmail(email, emailTemplate.subject, emailTemplate.html);

  res.json({
    success: true,
    message: 'If an account exists with this email, a password reset link has been sent'
  });
}));

// ==================== RESET PASSWORD ====================
router.post('/reset-password', 
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(passwordRegex)
      .withMessage('Password must contain uppercase, lowercase, number, and special character')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, true, errors.array());
    }

    const { token, newPassword } = req.body;

    const passwordReset = await PasswordReset.findOne({
      token: token,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!passwordReset) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const user = await User.findById(passwordReset.user);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.passwordHistory && user.passwordHistory.length > 0) {
      const last5Passwords = user.passwordHistory.slice(-5);
      for (const oldPassword of last5Passwords) {
        const isMatch = await require('bcryptjs').compare(newPassword, oldPassword.password);
        if (isMatch) {
          throw new AppError('Password cannot be one of your last 5 passwords', 400);
        }
      }
    }

    const oldHashedPassword = user.password;
    if (oldHashedPassword) {
      if (!user.passwordHistory) {
        user.passwordHistory = [];
      }
      user.passwordHistory.push({
        password: oldHashedPassword,
        changedAt: new Date()
      });
      if (user.passwordHistory.length > 5) {
        user.passwordHistory = user.passwordHistory.slice(-5);
      }
    }

    user.password = newPassword;
    await user.save();

    passwordReset.used = true;
    passwordReset.usedAt = new Date();
    await passwordReset.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  })
);

// ==================== CHANGE PASSWORD ====================
router.post('/change-password', authMiddleware, 
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(passwordRegex)
      .withMessage('Password must contain uppercase, lowercase, number, and special character')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, true, errors.array());
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    if (user.passwordHistory && user.passwordHistory.length > 0) {
      const last5Passwords = user.passwordHistory.slice(-5);
      for (const oldPassword of last5Passwords) {
        const isMatch = await require('bcryptjs').compare(newPassword, oldPassword.password);
        if (isMatch) {
          throw new AppError('Password cannot be one of your last 5 passwords', 400);
        }
      }
    }

    const oldHashedPassword = user.password;
    if (oldHashedPassword) {
      if (!user.passwordHistory) {
        user.passwordHistory = [];
      }
      user.passwordHistory.push({
        password: oldHashedPassword,
        changedAt: new Date()
      });
      if (user.passwordHistory.length > 5) {
        user.passwordHistory = user.passwordHistory.slice(-5);
      }
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

// ==================== EMAIL VERIFICATION ====================
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new AppError('Verification token is required', 400);
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() }
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  user.emailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  await user.save();

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
}));

// ==================== RESEND VERIFICATION ====================
router.post('/resend-verification', authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.emailVerified) {
    throw new AppError('Email is already verified', 400);
  }

  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = emailVerificationToken;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${emailVerificationToken}`;
  const emailTemplate = emailTemplates.emailVerification(user.username, verificationLink);
  await sendEmail(user.email, emailTemplate.subject, emailTemplate.html);

  res.json({
    success: true,
    message: 'Verification email sent'
  });
}));

module.exports = router;
