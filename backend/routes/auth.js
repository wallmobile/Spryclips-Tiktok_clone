const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const RefreshToken = require('../models/RefreshToken');
const EmailVerification = require('../models/EmailVerification');
const ActivityLog = require('../models/ActivityLog');
const Session = require('../models/Session');
const authMiddleware = require('../middleware/auth');
const { authLimiter, codeVerificationLimiter } = require('../utils/rateLimiter');
const { sendEmail, emailTemplates, transporter } = require('../utils/emailService');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { asyncHandler, AppError } = require('../utils/errorHandler');

// Generate JWT access token (3 days - user stays logged in for 2-3 days)
const generateAccessToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '3d' // 3 days - user stays logged in
  });
};

// Generate refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Password validation regex - allows common special characters
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z\d@$!%*?&#\-_.]{8,}$/;

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
  _id: user._id, // Also include _id for compatibility
  username: user.username,
  email: user.email,
  profile: user.profile,
  role: user.role || 'user', // Ensure role is always present
  emailVerified: user.emailVerified
});

// Cookie configuration for better session persistence
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/'
  };
};

const issueAuthSuccess = async ({
  user,
  req,
  res,
  statusCode = 200,
  extra = {}
}) => {
  try {
    console.log('🔑 Generating access token...');
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured. Please restart backend after adding it to .env');
    }
    const accessToken = generateAccessToken(user._id);
    const refreshTokenValue = generateRefreshToken();

    console.log('💾 Creating refresh token...');
    let refreshTokenDoc = null;
    try {
      refreshTokenDoc = new RefreshToken({
        user: user._id,
        token: refreshTokenValue,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent') || 'Unknown'
      });
      await refreshTokenDoc.save();
    } catch (refreshError) {
      // Log only in development
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error saving refresh token:', refreshError.message);
      }
      // Don't fail login if refresh token save fails - we can still proceed
      console.warn('⚠️ Continuing without refresh token...');
    }

    // Create Session entry for tracking (non-blocking, production-safe)
    // This runs in background and won't block login response
    setImmediate(async () => {
      try {
        const userAgent = req.get('user-agent') || '';
        let device = 'Unknown';
        let browser = 'Unknown';
        let os = 'Unknown';
        
        // Simple device detection from user agent
        if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
          device = 'Mobile';
        } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
          device = 'Tablet';
        } else {
          device = 'Desktop';
        }
        
        if (userAgent.includes('Chrome')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';
        
        if (userAgent.includes('Windows')) os = 'Windows';
        else if (userAgent.includes('Mac')) os = 'macOS';
        else if (userAgent.includes('Linux')) os = 'Linux';
        else if (userAgent.includes('Android')) os = 'Android';
        else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) os = 'iOS';
        
        const session = new Session({
          user: user._id,
          token: accessToken,
          refreshToken: refreshTokenValue,
          ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
          userAgent: userAgent,
          device: device,
          browser: browser,
          os: os,
          location: 'Unknown',
          isActive: true,
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        });
        
        // Use save with error handling - don't throw, just log
        await session.save().catch(err => {
          // Log error but don't throw - session tracking is optional
          if (process.env.NODE_ENV === 'development') {
            console.error('⚠️ Session tracking failed (non-critical):', err.message);
          }
        });
      } catch (sessionError) {
        // Silent fail in production, log in development
        if (process.env.NODE_ENV === 'development') {
          console.error('⚠️ Session creation error (non-critical):', sessionError.message);
        }
      }
    });

    const cookieOptions = getCookieOptions();

    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.cookie('refreshToken', refreshTokenValue, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log('📤 Sending response...');
    console.log('Response headers sent check:', res.headersSent);
    
    // Check if response already sent
    if (res.headersSent) {
      console.error('❌ Response already sent! Cannot send again.');
      console.error('Response headers:', res.getHeaders());
      return;
    }
    
    try {
      const userResponse = buildUserResponse(user);
      console.log('✅ User response built');
      
      const responseData = {
        success: true,
        user: userResponse,
        token: accessToken,
        refreshToken: refreshTokenValue,
        tokens: {
          accessToken,
          refreshToken: refreshTokenValue
        },
        ...extra
      };
      
      console.log('📋 Response data prepared, sending...');
      console.log('Response status code:', statusCode);
      res.status(statusCode).json(responseData);
      console.log('✅ Response sent successfully');
      console.log('Response headers after send:', res.getHeaders());
    } catch (responseError) {
      console.error('═══════════════════════════════════════════════════════════');
      console.error('❌ ERROR building/sending response');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('Error message:', responseError.message);
      console.error('Error name:', responseError.name);
      console.error('Error stack:', responseError.stack);
      console.error('Response headers sent:', res.headersSent);
      console.error('═══════════════════════════════════════════════════════════');
      
      // Send a simpler response if buildUserResponse fails
      if (!res.headersSent) {
        try {
          console.log('Attempting fallback response...');
          res.status(statusCode).json({
            success: true,
            user: {
              id: user._id?.toString() || user._id,
              username: user.username || '',
              email: user.email || '',
              role: user.role || 'user'
            },
            token: accessToken,
            refreshToken: refreshTokenValue
          });
          console.log('✅ Fallback response sent');
        } catch (fallbackError) {
          console.error('❌ Even fallback response failed:', fallbackError.message);
          console.error('Fallback error stack:', fallbackError.stack);
          throw fallbackError; // Let asyncHandler handle it
        }
      } else {
        console.error('❌ Cannot send fallback - response already sent');
      }
    }
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ ERROR in issueAuthSuccess');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('═══════════════════════════════════════════════════════════');
    throw error;
  }
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
      .withMessage('Password must contain uppercase, lowercase, number, and special character (e.g., !@#$%^&*)')
  ],
  asyncHandler(async (req, res) => {
    console.log('📝 Registration attempt:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation failed:', errors.array());
      throw new AppError('Validation failed', 400, true, errors.array());
    }

    const { username, email, password } = req.body;

    // Normalize email to lowercase (even though validation normalizes it)
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    const existingUser = await User.findOne({ 
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }] 
    });

    if (existingUser) {
      console.log('❌ User already exists:', normalizedEmail);
      throw new AppError('User with this email or username already exists', 400);
    }

    // Generate 6-digit verification code (like password reset)
    const emailVerificationCode = PasswordReset.generateCode();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Also keep token for backward compatibility
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const user = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      authProvider: 'local',
      emailVerificationToken, // Keep for backward compatibility
      emailVerificationCode, // 6-digit code
      emailVerificationExpires,
      profile: {
        displayName: username // Keep original case for display name
      }
    });

    await user.save();
    console.log('✅ User created:', normalizedEmail);

    // Log code to console for development (always visible)
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📧 EMAIL VERIFICATION CODE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📧 Email:', normalizedEmail);
    console.log('👤 Username:', username);
    console.log('🔢 Verification Code:', emailVerificationCode);
    console.log('⏰ Expires:', emailVerificationExpires.toLocaleString());
    console.log('═══════════════════════════════════════════════════════════');
    console.log('💡 NOTE: In development mode, code is shown here.');
    console.log('   For real emails, configure EMAIL_SERVICE in .env');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Send verification code via email (non-blocking)
    const emailTemplate = emailTemplates.signupVerificationCode(username, emailVerificationCode);
    sendEmail(email, emailTemplate.subject, emailTemplate.html).catch(err => {
      console.warn('⚠️ Email sending failed:', err.message);
    });

    // Issue auth tokens and respond
    await issueAuthSuccess({
      user,
      req,
      res,
      statusCode: 201,
      extra: {
        message: 'Account created successfully. Please check your email for the verification code.',
        requiresEmailVerification: true,
        emailVerificationCodeSent: true
      }
    });
    console.log('✅ Registration complete:', normalizedEmail);
  })
);

// Login
router.post('/login', 
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email address (e.g., yourname@example.com)'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  asyncHandler(async (req, res) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔐 LOGIN REQUEST STARTED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Email:', req.body.email);
    console.log('Has password:', !!req.body.password);
    console.log('Request IP:', req.ip);
    console.log('User Agent:', req.get('user-agent'));
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Extract specific validation error messages
        const errorMessages = errors.array().map(err => {
          return err.msg || (err.param === 'email' ? 'Please enter a valid email address' : 'Invalid input');
        });
        throw new AppError(errorMessages.join('. '), 400, true, errors.array());
      }

      const { email, password } = req.body;
      console.log('📧 Processing login for:', email);

      // Ensure email is lowercase for lookup (even though validation normalizes it)
      const normalizedEmail = email.toLowerCase().trim();
    
      // Try to find user with normalized email
      let user = await User.findOne({ email: normalizedEmail });
      
      // If not found, try case-insensitive search as fallback
      if (!user) {
        user = await User.findOne({ 
          email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });
      }
      
      if (!user) {
        // Don't reveal if email exists for security, but log for debugging
        console.log(`Login attempt failed: User not found for email: ${normalizedEmail}`);
        throw new AppError('Invalid email or password. Please check your credentials and try again.', 400);
      }

      // Check if user has a password (for social auth users trying to login with email/password)
      if (user.authProvider !== 'local') {
        console.log(`Login attempt failed: User ${normalizedEmail} was created with ${user.authProvider} login`);
        throw new AppError('This account was created with social login. Please use the same method to sign in.', 400);
      }

      if (!user.password) {
        console.log(`Login attempt failed: User ${normalizedEmail} has no password set`);
        throw new AppError('This account has no password set. Please use password reset or social login.', 400);
      }

      if (user.isLocked()) {
        const lockTime = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
        throw new AppError(`Account is temporarily locked due to too many failed login attempts. Please try again in ${lockTime} minutes.`, 423);
      }

      // Block banned accounts
      if (user.accountStatus === 'banned') {
        throw new AppError('Your account has been restricted. If you believe this is an error, please contact our support team for review.', 403);
      }
      
      // Block ALL suspended accounts (both self-deactivated and admin-suspended) - they cannot login
      if (user.accountStatus === 'suspended') {
        if (user.isSelfDeactivated) {
          const deactivatedDays = user.deactivatedAt 
            ? Math.floor((new Date() - new Date(user.deactivatedAt)) / (1000 * 60 * 60 * 24))
            : 0;
          
          if (deactivatedDays > 30) {
            throw new AppError('Your account was deactivated more than 30 days ago. To restore your account, please reach out to our support team. We\'re here to help!', 403);
          }
          
          throw new AppError('Your account is currently deactivated. To reactivate it, please contact our support team. We\'ll be happy to assist you!', 403);
        } else {
          // Admin-suspended account
          throw new AppError('Your account access has been temporarily restricted. Please contact our support team for assistance. We\'re here to help!', 403);
        }
      }

      // Compare password - ensure no extra whitespace
      const trimmedPassword = password.trim();
      
      // Debug: Log user info (without password)
      console.log(`Login attempt for: ${normalizedEmail}, authProvider: ${user.authProvider}, hasPassword: ${!!user.password}`);
      
      // Ensure password exists before comparing
      if (!user.password) {
        console.log(`Login attempt failed: User ${normalizedEmail} has no password stored`);
        throw new AppError('Invalid email or password. Please check your credentials and try again.', 400);
      }
      
      let isMatch = false;
      try {
        isMatch = await user.comparePassword(trimmedPassword);
        console.log(`Password match result for ${normalizedEmail}: ${isMatch}`);
      } catch (error) {
        console.error(`Error comparing password for ${normalizedEmail}:`, error);
        throw new AppError('An error occurred while verifying your password. Please try again.', 500);
      }
      
      if (!isMatch) {
        console.log(`Login attempt failed: Password mismatch for user ${normalizedEmail}`);
        await user.incLoginAttempts();
        // Reload to get updated failed attempts count
        const updatedUser = await User.findById(user._id);
        const remainingAttempts = 5 - ((updatedUser?.failedLoginAttempts || 0) + 1);
        if (remainingAttempts > 0) {
          throw new AppError(`Invalid email or password. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`, 400);
        }
        throw new AppError('Invalid email or password. Account will be locked after too many failed attempts.', 400);
      }

      await user.resetLoginAttempts();
      
      // Only reactivate if it was admin-suspended (not self-deactivated)
      // Self-deactivated accounts cannot login and must contact admin
      const wasAdminSuspended = user.accountStatus === 'suspended' && !user.isSelfDeactivated;
      if (wasAdminSuspended) {
        user.accountStatus = 'active';
        user.isSelfDeactivated = false;
        if (user.deactivatedAt) {
          user.deactivatedAt = null;
        }
        console.log(`✅ Admin-suspended account reactivated on login: ${user._id}`);
      }
      
      user.lastLogin = new Date();
      
      // Create ActivityLog entry for login
      try {
        await ActivityLog.create({
          user: user._id,
          action: 'login',
          resource: 'auth',
          details: wasAdminSuspended ? 'Account reactivated and logged in' : 'User logged in successfully',
          ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
          userAgent: req.get('user-agent') || '',
          status: 'success'
        });
        console.log('✅ Activity log created for login');
      } catch (logError) {
        console.error('⚠️ Failed to create activity log for login:', logError.message);
        console.error('Activity log error details:', logError);
        // Don't fail login if logging fails
      }
      
      // Log login activity
      if (!user.accountActivity) {
        user.accountActivity = [];
      }
      user.accountActivity.unshift({
        action: wasAdminSuspended ? 'Account Reactivated' : 'Login',
        device: req.get('user-agent') || 'Unknown Device',
        location: 'Unknown Location',
        ip: req.ip,
        status: 'success'
      });
      // Keep only last 50 activities
      if (user.accountActivity.length > 50) {
        user.accountActivity = user.accountActivity.slice(0, 50);
      }
      
      console.log('💾 Saving user...');
      try {
        await user.save();
        console.log('✅ User saved');
      } catch (saveError) {
        console.error('❌ Error saving user:', saveError.message);
        console.error('Save error stack:', saveError.stack);
        throw new AppError('Failed to save user data. Please try again.', 500);
      }

      console.log('🎉 Issuing auth success response...');
      try {
        await issueAuthSuccess({
          user,
          req,
          res,
          extra: {
            message: 'Login successful'
          }
        });
        console.log('✅ Login successful for:', normalizedEmail);
      } catch (authError) {
        console.error('❌ Error in issueAuthSuccess:', authError.message);
        console.error('Auth error name:', authError.name);
        console.error('Auth error stack:', authError.stack);
        // If response already sent, don't send again
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Login failed due to server error',
            error: process.env.NODE_ENV === 'development' ? authError.message : undefined
          });
        }
        throw authError;
      }
    } catch (error) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('❌ ERROR IN LOGIN ROUTE');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('FULL ERROR:', error);
      console.log('ERROR MESSAGE:', error.message);
      console.log('ERROR NAME:', error.name);
      console.log('ERROR STACK:', error.stack);
      console.log('ERROR STATUS CODE:', error.statusCode);
      console.log('ERROR CODE:', error.code);
      if (error.response) {
        console.log('RESPONSE DATA:', error.response.data);
        console.log('RESPONSE STATUS:', error.response.status);
      }
      // Additional debugging
      if (error.message) {
        console.log('ERROR MESSAGE DETAILS:', error.message);
      }
      if (error.stack) {
        console.log('STACK TRACE:', error.stack);
      }
      console.log('═══════════════════════════════════════════════════════════');
      throw error; // Re-throw to let asyncHandler handle it
    }
  })
);

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    throw new AppError({
      message: 'Refresh token required',
      statusCode: 401,
      code: 'UNAUTHORIZED',
      userMessage: 'Please sign in to continue.'
    });
  }

  const tokenDoc = await RefreshToken.findOne({ token: refreshToken });

  if (!tokenDoc) {
    throw new AppError({
      message: 'Invalid or expired refresh token',
      statusCode: 401,
      code: 'UNAUTHORIZED',
      userMessage: 'Your session has expired. Please sign in again.'
    });
  }

  // Check if token is valid
  if (!tokenDoc.isValid || typeof tokenDoc.isValid !== 'function') {
    // Fallback validation if isValid method doesn't exist
    if (tokenDoc.revoked || (tokenDoc.expiresAt && new Date(tokenDoc.expiresAt) <= new Date())) {
      throw new AppError({
        message: 'Invalid or expired refresh token',
        statusCode: 401,
        code: 'UNAUTHORIZED',
        userMessage: 'Your session has expired. Please sign in again.'
      });
    }
  } else if (!tokenDoc.isValid()) {
    throw new AppError({
      message: 'Invalid or expired refresh token',
      statusCode: 401,
      code: 'UNAUTHORIZED',
      userMessage: 'Your session has expired. Please sign in again.'
    });
  }

  // Get user ID - handle both populated and non-populated cases
  let userId = null;
  
  if (tokenDoc.user) {
    // Check if user is populated (object) or just ObjectId
    if (typeof tokenDoc.user === 'object' && tokenDoc.user._id) {
      userId = tokenDoc.user._id;
    } else if (typeof tokenDoc.user === 'object' && tokenDoc.user.toString) {
      userId = tokenDoc.user;
    } else {
      userId = tokenDoc.user;
    }
  } else if (tokenDoc.userId) {
    userId = tokenDoc.userId;
  }
  
  if (!userId) {
    console.error('Refresh token error: No userId found', {
      tokenDocId: tokenDoc._id,
      hasUser: !!tokenDoc.user,
      hasUserId: !!tokenDoc.userId,
      userType: typeof tokenDoc.user
    });
    throw new AppError({
      message: 'Invalid refresh token - user not found',
      statusCode: 401,
      code: 'UNAUTHORIZED',
      userMessage: 'Your session has expired. Please sign in again.'
    });
  }

  // Ensure userId is a string/ObjectId, not an object
  const userIdString = userId.toString ? userId.toString() : userId;
  
  const accessToken = generateAccessToken(userIdString);

  const cookieOptions = getCookieOptions();
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  res.json({
    success: true,
    accessToken
  });
}));

// Logout (requires auth)
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const accessToken = req.cookies.accessToken || req.headers.authorization?.replace('Bearer ', '');
  
  if (refreshToken) {
    await RefreshToken.findOneAndUpdate(
      { token: refreshToken },
      { revoked: true, revokedAt: new Date() }
    );
  }

  // Mark session as inactive
  if (accessToken) {
    try {
      await Session.findOneAndUpdate(
        { token: accessToken, isActive: true },
        { 
          isActive: false, 
          terminatedAt: new Date(),
          terminatedBy: req.user._id
        }
      );
    } catch (sessionError) {
      console.error('Failed to update session on logout:', sessionError.message);
      // Don't fail logout if session update fails
    }
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Clear session - PUBLIC endpoint (no auth required) for clearing stale tokens
router.post('/clear-session', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  
  // Revoke the refresh token if it exists
  if (refreshToken) {
    await RefreshToken.findOneAndUpdate(
      { token: refreshToken },
      { revoked: true, revokedAt: new Date() }
    );
  }

  // Clear all auth cookies
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });

  res.json({
    success: true,
    message: 'Session cleared successfully'
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
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
  await refreshToken.save();

  const cookieOptions = getCookieOptions();
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  res.cookie('refreshToken', refreshTokenValue, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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
  // Fetch fresh user from database - optimized query with only needed fields
  const freshUser = await User.findById(req.user._id)
    .select('username email profile role emailVerified accountStatus isSelfDeactivated deactivatedAt privacy')
    .lean();
  
  // Ensure profile object includes all fields, even if empty
  const profile = freshUser.profile || {};
  
  // ALWAYS include banner field explicitly, even if empty
  const profileWithBanner = {
    displayName: profile.displayName || '',
    bio: profile.bio || '',
    avatar: profile.avatar || '',
    banner: profile.banner || '', // ALWAYS include banner
    website: profile.website || '',
    followers: profile.followers || 0,
    following: profile.following || 0,
    likes: profile.likes || 0,
    pinnedVideo: profile.pinnedVideo || null,
    isVerified: profile.isVerified || false,
    qrScans: profile.qrScans || 0,
    profileViews: profile.profileViews || 0
  };

  // ALWAYS include privacy object explicitly, even if empty
  const privacy = freshUser.privacy || {};
  const privacyWithDefaults = {
    accountType: privacy.accountType || 'public',
    showActivityStatus: privacy.showActivityStatus !== undefined ? privacy.showActivityStatus : true,
    allowDirectMessages: privacy.allowDirectMessages || 'everyone',
    commentFilter: privacy.commentFilter || false,
    downloadEnabled: privacy.downloadEnabled !== undefined ? privacy.downloadEnabled : true,
    mentionsEnabled: privacy.mentionsEnabled !== undefined ? privacy.mentionsEnabled : true,
    tagsEnabled: privacy.tagsEnabled !== undefined ? privacy.tagsEnabled : true,
    duetEnabled: privacy.duetEnabled !== undefined ? privacy.duetEnabled : true,
    stitchEnabled: privacy.stitchEnabled !== undefined ? privacy.stitchEnabled : true,
    filteredKeywords: privacy.filteredKeywords || []
  };
  
  res.json({
    success: true,
    user: {
      id: freshUser._id,
      username: freshUser.username,
      email: freshUser.email,
      accountStatus: freshUser.accountStatus || 'active', // Include account status
      isSelfDeactivated: freshUser.isSelfDeactivated || false, // Include deactivation flag
      deactivatedAt: freshUser.deactivatedAt || null, // Include deactivation date
      profile: profileWithBanner,
      privacy: privacyWithDefaults, // ALWAYS include privacy settings
      role: freshUser.role,
      emailVerified: freshUser.emailVerified
    }
  });
});

// ==================== FORGOT PASSWORD ====================
// NO RATE LIMITER - Rely on database tracking and email service limits
// Rate limiting removed to prevent blocking first-time legitimate requests
router.post('/forgot-password', asyncHandler(async (req, res) => {
  console.log('🔔 FORGOT PASSWORD REQUEST RECEIVED:', {
    email: req.body?.email,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({
      success: true,
      message: 'If an account exists with this email, a verification code has been sent to you.'
    });
  }

  // Invalidate any existing unused reset codes for this user
  // This allows users to request a new code anytime (first request always works)
  await PasswordReset.updateMany(
    { user: user._id, used: false, expiresAt: { $gt: new Date() } },
    { used: true }
  );

  // Generate 6-digit verification code
  const code = PasswordReset.generateCode();
  const token = PasswordReset.generateToken();

  const passwordReset = new PasswordReset({
    user: user._id,
    token: token,
    code: code,
    expiresAt: new Date(Date.now() + 3600000) // 1 hour
  });

  await passwordReset.save();

  // Log code to console for development (always visible)
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔐 PASSWORD RESET VERIFICATION CODE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📧 Email:', user.email);
  console.log('🔢 Code:', code);
  console.log('⏰ Expires:', new Date(Date.now() + 3600000).toLocaleString());
  console.log('═══════════════════════════════════════════════════════════');
  console.log('💡 NOTE: In development mode, code is shown here.');
  console.log('   For real emails, configure EMAIL_SERVICE in .env');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Send verification code via email
  const emailTemplate = emailTemplates.passwordResetCode(user.username || 'User', code);
  const emailResult = await sendEmail(user.email, emailTemplate.subject, emailTemplate.html);

  if (!emailResult.success) {
    console.error('Failed to send password reset email:', emailResult.error);
    // Don't reveal email sending failure to user (security best practice)
  }

  res.json({
    success: true,
    message: 'If an account exists with this email, a verification code has been sent to you.'
  });
}));

// ==================== VERIFY RESET CODE ====================
// NO RATE LIMITER - Only database tracking for failed attempts
// If code is correct (true), unlimited attempts allowed
// If code is wrong (false), 15 attempts then 10 hours lock
router.post('/verify-reset-code', asyncHandler(async (req, res) => {
  const { code, email } = req.body;

  if (!code) {
    throw new AppError('Verification code is required', 400);
  }

  // Find password reset by code (exact match)
  let passwordReset = await PasswordReset.findOne({
    code: code.trim(),
    used: false,
    expiresAt: { $gt: new Date() }
  });

  // If exact code match not found, try to find recent reset for this email/user to track failed attempts
  if (!passwordReset && email) {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      // Find most recent unused reset code for this user to track failed attempts
      passwordReset = await PasswordReset.findOne({
        user: user._id,
        used: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });
    }
  }

  // If still no passwordReset found, return generic error (don't reveal code existence)
  if (!passwordReset) {
    throw new AppError('Invalid or expired verification code', 400);
  }

  // Check if code is locked (too many failed attempts) - ONLY check if code is WRONG
  // We'll check this AFTER verifying if code matches

  // Check if code matches exactly FIRST
  if (passwordReset.code === code.trim()) {
    // ✅ CODE IS CORRECT (TRUE) - Reset all attempts, unlock, allow unlimited usage
    passwordReset.failedAttempts = 0;
    passwordReset.lockedUntil = null;
    await passwordReset.save();

    // No limits - user can verify as many times as they want now
    return res.json({
      success: true,
      message: 'Verification code is valid'
    });
  }

  // ❌ CODE IS WRONG (FALSE) - Check lock status and track failed attempts
  
  // Check if already locked
  if (passwordReset.lockedUntil && passwordReset.lockedUntil > new Date()) {
    const hoursRemaining = Math.ceil((passwordReset.lockedUntil - new Date()) / (1000 * 60 * 60));
    throw new AppError(`Too many failed attempts. Please try again after ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}.`, 429);
  }

  // If locked period has expired, reset the lock
  if (passwordReset.lockedUntil && passwordReset.lockedUntil <= new Date()) {
    passwordReset.lockedUntil = null;
    passwordReset.failedAttempts = 0;
  }

  // Wrong code - increment failed attempts
  passwordReset.failedAttempts = (passwordReset.failedAttempts || 0) + 1;
  
  // Lock after 15 failed attempts for 10 hours
  if (passwordReset.failedAttempts >= 15) {
    passwordReset.lockedUntil = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10 hours
    await passwordReset.save();
    throw new AppError('Too many failed attempts. Please try again after 10 hours.', 429);
  }
  
  await passwordReset.save();
  const remainingAttempts = 15 - passwordReset.failedAttempts;
  throw new AppError(`Invalid verification code. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`, 400);
}));

// ==================== RESET PASSWORD ====================
router.post('/reset-password', 
  [
    body('token').optional().notEmpty().withMessage('Token must not be empty if provided'),
    body('code').optional().notEmpty().withMessage('Code must not be empty if provided'),
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

    const { token, code, newPassword } = req.body;

    // Require either token or code
    if (!token && !code) {
      throw new AppError('Verification code or token is required', 400);
    }

    // Find password reset by code (preferred) or token
    let passwordReset;
    if (code) {
      passwordReset = await PasswordReset.findOne({
        code: code.trim(),
        used: false,
        expiresAt: { $gt: new Date() }
      });
    } else {
      passwordReset = await PasswordReset.findOne({
        token: token,
        used: false,
        expiresAt: { $gt: new Date() }
      });
    }

    if (!passwordReset) {
      throw new AppError('Invalid or expired verification code. Please request a new code.', 400);
    }

    const user = await User.findById(passwordReset.user);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check password history (prevent reusing last 5 passwords)
    if (user.passwordHistory && user.passwordHistory.length > 0) {
      const last5Passwords = user.passwordHistory.slice(-5);
      for (const oldPassword of last5Passwords) {
        const isMatch = await require('bcryptjs').compare(newPassword, oldPassword.password);
        if (isMatch) {
          throw new AppError('Password cannot be one of your last 5 passwords', 400);
        }
      }
    }

    // Save old password to history
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

    // Update password
    user.password = newPassword;
    await user.save();

    // Mark reset code/token as used
    passwordReset.used = true;
    passwordReset.usedAt = new Date();
    await passwordReset.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.'
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
  const { token, code, email } = req.body;

  // Require either token or code
  if (!token && !code) {
    throw new AppError('Verification token or code is required', 400);
  }

  let user;

  // If code is provided, verify using code
  if (code) {
    if (!email) {
      throw new AppError('Email is required when verifying with code', 400);
    }

    user = await User.findOne({
      email: email.toLowerCase().trim(),
      emailVerificationCode: code.trim(),
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new AppError('Invalid or expired verification code', 400);
    }
  } else {
    // Use token (backward compatibility)
    user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }
  }

  // Verify email
  user.emailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationCode = null;
  user.emailVerificationExpires = null;
  await user.save();

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
}));

// ==================== SEND SIGNUP VERIFICATION CODE ====================
// Send verification code before signup (no auth required)
router.post('/send-signup-verification', asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    console.log("sendSignupVerificationCode for", email);

    // Generate 6 digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save or update the code in MongoDB
    await EmailVerification.findOneAndUpdate(
      { email },
      { email, code, expiresAt },
      { upsert: true, new: true }
    );

    // Use Gmail SMTP (no domain verification needed)
    const nodemailer = require('nodemailer');
    
    // Check Gmail configuration
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error("❌ GMAIL CONFIGURATION MISSING:");
      console.error("   GMAIL_USER:", process.env.GMAIL_USER || "NOT SET");
      console.error("   GMAIL_APP_PASSWORD:", process.env.GMAIL_APP_PASSWORD ? "SET" : "NOT SET");
      throw new Error("Gmail configuration missing - check .env file");
    }

    // Create Gmail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    console.log("📧 Attempting to send email via Gmail SMTP to:", email);
    console.log("📧 Using sender:", process.env.GMAIL_USER);

    // Send email with OTP using Gmail SMTP
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Your Verification Code",
      text: `Your OTP code is: ${code}`
    });

    console.log("✅ Email sent successfully via Gmail SMTP!");
    console.log("   Message ID:", info.messageId);
    console.log("   To:", email);
    console.log("   From:", process.env.GMAIL_USER);

    return res.json({
      success: true,
      message: "Verification code sent"
    });

  } catch (error) {
    console.error("❌ EMAIL SENDING ERROR:");
    console.error("   Error Message:", error.message);
    if (error.response) {
      console.error("   Error Response:", error.response);
    }
    console.error("   Full Error:", error);
    
    return res.status(500).json({
      success: false,
      message: "Failed to send verification code"
    });
  }
}));

// ==================== VERIFY SIGNUP CODE ====================
// Verify code before signup (no auth required)
router.post('/verify-signup-code', asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  // Step 1: Validate inputs
  if (!email || !code) {
    return res.status(400).json({
      success: false,
      message: 'Email and verification code are required'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  // Validate code format (6 digits)
  const codeRegex = /^\d{6}$/;
  if (!codeRegex.test(code.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Verification code must be 6 digits'
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedCode = code.trim();

  // Step 2: Find OTP record in MongoDB by email and code
  const emailVerification = await EmailVerification.findOne({
    email: normalizedEmail,
    code: normalizedCode,
    used: false
  });

  // Step 3: If no record found, return error
  if (!emailVerification) {
    return res.status(400).json({
      success: false,
      message: 'Invalid code'
    });
  }

  // Step 4: Check if current time is greater than expiresAt
  const now = new Date();
  if (emailVerification.expiresAt <= now) {
    // Mark as used to prevent reuse
    emailVerification.used = true;
    await emailVerification.save();
    return res.status(400).json({
      success: false,
      message: 'Code expired'
    });
  }

  // Step 5: If everything is valid, mark code as used
  emailVerification.used = true;
  await emailVerification.save();

  console.log('✅ Signup code verification successful:', normalizedEmail);

  // Step 6: Return success response
  res.json({
    success: true,
    message: 'Verified Successfully'
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

  const verificationLink = `${process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://spryclips.com' : 'http://localhost:3000')}/verify-email?token=${emailVerificationToken}`;
  const emailTemplate = emailTemplates.emailVerification(user.username, verificationLink);
  await sendEmail(user.email, emailTemplate.subject, emailTemplate.html);

  res.json({
    success: true,
    message: 'Verification email sent'
  });
}));

module.exports = router;
