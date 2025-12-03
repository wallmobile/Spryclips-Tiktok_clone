// Quick script to check email configuration
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║        📧 EMAIL CONFIGURATION CHECK 📧                    ║');
console.log('╠═══════════════════════════════════════════════════════════╣');

const emailFrom = process.env.EMAIL_FROM;
const emailAppPassword = process.env.EMAIL_APP_PASSWORD;

console.log('║  EMAIL_FROM:', (emailFrom || 'NOT SET').padEnd(47) + '║');
console.log('║  EMAIL_APP_PASSWORD:', (emailAppPassword ? 'SET (hidden)' : 'NOT SET').padEnd(40) + '║');
console.log('╠═══════════════════════════════════════════════════════════╣');

if (!emailFrom || !emailAppPassword) {
  console.log('║  Status: ❌ CONFIGURATION MISSING                          ║');
  console.log('║                                                           ║');
  console.log('║  Fix: Add to backend/.env file:                          ║');
  console.log('║    EMAIL_FROM=your-email@gmail.com                       ║');
  console.log('║    EMAIL_APP_PASSWORD=your-16-digit-app-password         ║');
  console.log('║                                                           ║');
  console.log('║  Steps:                                                  ║');
  console.log('║  1. Go to: https://myaccount.google.com/apppasswords     ║');
  console.log('║  2. Generate App Password for "Mail"                     ║');
  console.log('║  3. Copy 16-digit password                               ║');
  console.log('║  4. Add to backend/.env file                             ║');
  console.log('║  5. Restart backend server                               ║');
} else {
  console.log('║  Status: ✅ CONFIGURATION FOUND                            ║');
  console.log('║                                                           ║');
  console.log('║  Email should be sent when you click "Send code"         ║');
  console.log('║  If still not working, check backend console for errors  ║');
}

console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('\n');

