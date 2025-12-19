const createProvider = require('./provider');
const interactions = require('./interactions');

async function setupOIDC(app) {
  const oidc = await createProvider();

  // Mount interaction routes
  app.use('/oidc', interactions(oidc));

  // Mount OIDC provider at root to handle custom /o/ routes and .well-known
  app.use('/', oidc.callback());

  console.log('✅ OIDC Provider initialized');
  return oidc;
}

module.exports = setupOIDC;
