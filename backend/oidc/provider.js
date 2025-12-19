const { Provider } = require('oidc-provider');
const MongoAdapter = require('./adapter');
const User = require('../models/User');
const getJwks = require('./jwks');

async function createProvider() {
  const jwks = await getJwks();
  
  const configuration = {
    adapter: MongoAdapter,
    clients: [
      {
        client_id: process.env.OIDC_CLIENT_ID || 'spryclips_oidc',
        client_secret: process.env.OIDC_CLIENT_SECRET || 'november_2025_spryclips',
        grant_types: ['authorization_code', 'refresh_token'],
        redirect_uris: [
          'https://spryclips.com/auth/callback',
          'https://www.spryclips.com/auth/callback',
          'http://localhost:3000/auth/callback',
          'https://oauthdebugger.com/debug'
        ],
        response_types: ['code'],
      }
    ],
    routes: {
      authorization: '/o/authorize',
      token: '/o/token',
      userinfo: '/o/userinfo',
      jwks: '/o/jwks',
    },
    interactions: {
      url(ctx, interaction) {
        return `/oidc/interaction/${interaction.uid}`;
      },
    },
    cookies: {
      keys: [process.env.JWT_SECRET || 'some-secret-key'],
    },
    async findAccount(ctx, id) {
      const user = await User.findById(id);
      if (!user) return undefined;

      return {
        accountId: id,
        async claims(use, scope) {
          return {
            sub: id,
            email: user.email,
            email_verified: user.emailVerified,
            preferred_username: user.username,
            name: user.username,
          };
        },
      };
    },
    claims: {
      openid: ['sub'],
      email: ['email', 'email_verified'],
      profile: ['preferred_username', 'name'],
    },
    features: {
      devInteractions: { enabled: false },
      rpInitiatedLogout: { enabled: true },
    },
    jwks,
  };

  const issuer = process.env.OIDC_ISSUER || 'https://sprylogin.com';
  const oidc = new Provider(issuer, configuration);

  return oidc;
}

module.exports = createProvider;
