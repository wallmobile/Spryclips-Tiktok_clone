// OIDC Configuration for Hub App integration
// Replace these with your actual OIDC provider credentials

const oidcConfig = {
  issuer: process.env.OIDC_ISSUER || 'https://your-oidc-provider.com',
  clientId: process.env.OIDC_CLIENT_ID || 'your-client-id',
  clientSecret: process.env.OIDC_CLIENT_SECRET || 'your-client-secret',
  redirectUri: process.env.OIDC_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  scope: 'openid profile email'
};

module.exports = oidcConfig;
