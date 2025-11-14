process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.SKIP_DB_CONNECT = 'true';

// Mock email service to prevent real email sending during tests
jest.mock('../utils/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  emailTemplates: {
    welcome: jest.fn(() => ({ subject: 'Welcome', html: '<p>Welcome</p>' })),
    passwordReset: jest.fn(() => ({ subject: 'Reset', html: '<p>Reset</p>' })),
    emailVerification: jest.fn(() => ({ subject: 'Verify', html: '<p>Verify</p>' }))
  },
  initEmailService: jest.fn()
}));
