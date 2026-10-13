// OIDC Configuration for Hub App integration
// Replace these with your actual OIDC provider credentials

const getRedirectUri = () => {
  if (process.env.OIDC_REDIRECT_URI) {
    return process.env.OIDC_REDIRECT_URI;
  }
  const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://spryclips.com' : 'http://localhost:3000');
  return `${frontendUrl}/auth/callback`;
};

const oidcConfig = {
  issuer: process.env.OIDC_ISSUER || 'https://your-oidc-provider.com',
  clientId: process.env.OIDC_CLIENT_ID || 'your-client-id',
  clientSecret: process.env.OIDC_CLIENT_SECRET || 'your-client-secret',
  redirectUri: getRedirectUri(),
  scope: 'openid profile email'
};

module.exports = oidcConfig;
