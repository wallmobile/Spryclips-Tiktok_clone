// Quick test script to verify Resend email sending
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Resend } = require('resend');

async function testResendEmail() {
  console.log('\n=== RESEND EMAIL TEST ===\n');
  
  // Check configuration
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
  console.log('From Email:', fromEmail || 'NOT SET');
  console.log('\n');
  
  if (!apiKey || !fromEmail) {
    console.error('❌ Configuration missing!');
    process.exit(1);
  }
  
  // Initialize Resend
  const resend = new Resend(apiKey);
  
  // Test email send
  console.log('📧 Testing email send...');
  console.log('From:', fromEmail);
  console.log('To: mr.aliraza161.91@gmail.com');
  console.log('\n');
  
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: 'mr.aliraza161.91@gmail.com',
      subject: 'Test Email - Resend Configuration',
      text: 'This is a test email to verify Resend is working correctly. If you receive this, email configuration is correct!'
    });
    
    if (error) {
      console.error('❌ RESEND ERROR:');
      console.error('   Message:', error.message);
      console.error('   Name:', error.name);
      console.error('   Full Error:', JSON.stringify(error, null, 2));
      process.exit(1);
    }
    
    if (data) {
      console.log('✅ EMAIL SENT SUCCESSFULLY!');
      console.log('   Email ID:', data.id);
      console.log('\n');
      console.log('Check your inbox: mr.aliraza161.91@gmail.com');
      console.log('Also check spam folder!');
    }
  } catch (err) {
    console.error('❌ EXCEPTION:');
    console.error('   Message:', err.message);
    console.error('   Stack:', err.stack);
    process.exit(1);
  }
}

testResendEmail();

