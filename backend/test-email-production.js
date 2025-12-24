/**
 * Production Email Test Script
 * 
 * This script tests email configuration on production server.
 * Run this on the server to verify email setup.
 * 
 * Usage:
 *   node test-email-production.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

console.log('\n🔍 PRODUCTION EMAIL CONFIGURATION CHECK\n');
console.log('=' .repeat(60));

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('─'.repeat(60));
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'NOT SET ❌');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');
console.log('GMAIL_USER:', process.env.GMAIL_USER || 'NOT SET ❌');
console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? `SET (${process.env.GMAIL_APP_PASSWORD.length} chars)` : 'NOT SET ❌');

if (!process.env.EMAIL_SERVICE) {
  console.log('\n⚠️  WARNING: EMAIL_SERVICE is not set!');
  console.log('   Emails will be logged to console only (development mode)');
  console.log('   Add EMAIL_SERVICE=gmail to environment variables');
}

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.log('\n❌ ERROR: Gmail credentials not configured!');
  console.log('   Required variables:');
  console.log('   - GMAIL_USER');
  console.log('   - GMAIL_APP_PASSWORD');
  process.exit(1);
}

console.log('\n✅ All email environment variables are configured');

// Test email sending
(async () => {
  try {
    console.log('\n📧 Testing Email Service...');
    console.log('─'.repeat(60));
    
    const nodemailer = require('nodemailer');
    
    // Clean the app password
    const gmailUser = process.env.GMAIL_USER.trim();
    const gmailPassword = process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '').trim();
    
    console.log('Creating Gmail transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword
      }
    });
    
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    console.log('\nSending test email...');
    const testEmail = gmailUser; // Send to self for testing
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `SpryClips <${gmailUser}>`,
      to: testEmail,
      subject: 'SpryClips Email Test - Production',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FF0050 0%, #FE2C55 50%, #25F4EE 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Email Test Successful!</h1>
            </div>
            <div class="content">
              <div class="success">
                <strong>Success!</strong> Your SpryClips email service is configured correctly.
              </div>
              <h2>Configuration Details:</h2>
              <ul>
                <li><strong>Service:</strong> ${process.env.EMAIL_SERVICE}</li>
                <li><strong>From:</strong> ${process.env.EMAIL_FROM || gmailUser}</li>
                <li><strong>SMTP User:</strong> ${gmailUser}</li>
                <li><strong>Server:</strong> Gmail SMTP</li>
                <li><strong>Time:</strong> ${new Date().toISOString()}</li>
              </ul>
              <p>Verification emails will now be sent successfully from your production server.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('\n✅ TEST EMAIL SENT SUCCESSFULLY!');
    console.log('─'.repeat(60));
    console.log('Message ID:', info.messageId);
    console.log('From:', process.env.EMAIL_FROM || gmailUser);
    console.log('To:', testEmail);
    console.log('Response:', info.response);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ EMAIL CONFIGURATION IS WORKING CORRECTLY!');
    console.log('='.repeat(60));
    console.log('\n📝 Next Steps:');
    console.log('1. Check your inbox at:', testEmail);
    console.log('2. If email received, configuration is perfect!');
    console.log('3. If not received, check:');
    console.log('   - Gmail spam/junk folder');
    console.log('   - Gmail App Password is correct');
    console.log('   - 2-Step Verification is enabled on Gmail account');
    console.log('\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ EMAIL TEST FAILED!');
    console.error('─'.repeat(60));
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.command) console.error('Command:', error.command);
    if (error.response) console.error('Response:', error.response);
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify Gmail App Password is correct (16 chars, no spaces)');
    console.log('2. Ensure 2-Step Verification is enabled on Gmail');
    console.log('3. Check if "Less secure app access" is disabled (use App Passwords instead)');
    console.log('4. Verify GMAIL_USER email is correct');
    console.log('5. Check server firewall allows outbound SMTP (port 587/465)');
    console.log('\n');
    
    process.exit(1);
  }
})();
