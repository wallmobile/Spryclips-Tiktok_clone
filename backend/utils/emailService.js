const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter;

const initEmailService = () => {
  if (process.env.EMAIL_SERVICE === 'smtp') {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else if (process.env.EMAIL_SERVICE === 'gmail') {
    // Gmail service configuration
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER || process.env.GMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
      }
    });
  } else if (process.env.EMAIL_SERVICE === 'sendgrid') {
    // SendGrid configuration
    transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  } else {
    // Development: Use console logging instead of actual email
    transporter = {
      sendMail: async (options) => {
        // Extract verification code from HTML if it's a code email
        let verificationCode = null;
        const codeMatch = options.html.match(/<div class="code">(\d{6})<\/div>/);
        if (codeMatch) {
          verificationCode = codeMatch[1];
        }
        
        console.log('\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📧 EMAIL (Development Mode - Email not actually sent)');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        if (verificationCode) {
          console.log('');
          console.log('🔐 VERIFICATION CODE:', verificationCode);
          console.log('');
        }
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Note: In development mode, emails are logged here.');
        console.log('      To receive real emails, configure EMAIL_SERVICE in .env');
        console.log('═══════════════════════════════════════════════════════════\n');
        return { success: true, messageId: 'dev-' + Date.now() };
      }
    };
  }
};

// Initialize on module load
initEmailService();

const sendEmail = async (to, subject, html, text = null) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@tiktok-clone.com',
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
  };

  // Await transporter.sendMail - this will throw error if it fails
  const info = await transporter.sendMail(mailOptions);
  return { success: true, messageId: info.messageId };
};

// Email templates
const emailTemplates = {
  welcome: (username, verificationLink) => ({
    subject: 'Welcome to TikTok Clone!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to TikTok Clone!</h1>
          </div>
          <div class="content">
            <h2>Hi ${username}!</h2>
            <p>Thank you for joining TikTok Clone. We're excited to have you on board!</p>
            <p>Please verify your email address by clicking the button below:</p>
            <a href="${verificationLink}" class="button">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>${verificationLink}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordReset: (username, resetLink) => ({
    subject: 'Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hi ${username}!</h2>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            <a href="${resetLink}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>${resetLink}</p>
            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordResetCode: (username, code) => ({
    subject: 'Your Password Reset Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: #ffffff; border: 3px solid #f5576c; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .code { font-size: 36px; font-weight: bold; color: #f5576c; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Verification</h1>
          </div>
          <div class="content">
            <h2>Hi ${username}!</h2>
            <p>We received a request to reset your password. Use the verification code below to reset your password:</p>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <p>Enter this code in the password reset form to continue.</p>
            <div class="warning">
              <strong>Security Notice:</strong> This code will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </div>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              For your security, never share this code with anyone. TikTok Clone will never ask for this code.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  emailVerification: (username, verificationLink) => ({
    subject: 'Verify Your Email Address',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #4facfe; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <h2>Hi ${username}!</h2>
            <p>Please verify your email address by clicking the button below:</p>
            <a href="${verificationLink}" class="button">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>${verificationLink}</p>
            <p>This link will expire in 24 hours.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  signupVerificationCode: (username, code) => ({
    subject: 'Welcome to TikTok Clone - Verify Your Email',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF0050 0%, #FE2C55 50%, #25F4EE 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: #ffffff; border: 3px solid #FF0050; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
          .code { font-size: 36px; font-weight: bold; color: #FF0050; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to TikTok Clone!</h1>
          </div>
          <div class="content">
            <h2>Hi ${username}!</h2>
            <p>Thank you for joining TikTok Clone! We're excited to have you on board.</p>
            <p>To complete your account setup, please verify your email address using the code below:</p>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <p>Enter this 6-digit code in the verification form to activate your account.</p>
            <div class="warning">
              <strong>Important:</strong> This code will expire in 5 minutes. If you didn't create an account, please ignore this email.
            </div>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              For your security, never share this code with anyone. TikTok Clone will never ask for this code.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

module.exports = {
  sendEmail,
  emailTemplates,
  initEmailService,
  transporter // Export transporter for direct use
};

