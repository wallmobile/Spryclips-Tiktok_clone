const { generateKeyPair, exportJWK } = require('jose');
const fs = require('fs');
const path = require('path');

const JWKS_PATH = path.join(__dirname, 'jwks.json');

async function getJwks() {
  if (fs.existsSync(JWKS_PATH)) {
    return JSON.parse(fs.readFileSync(JWKS_PATH, 'utf8'));
  }

  console.log('Generating new JWKS...');
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const privateJwk = await exportJWK(privateKey);
  const publicJwk = await exportJWK(publicKey);

  // Add kid and other required fields
  const kid = Math.random().toString(36).substring(7);
  const jwks = {
    keys: [
      {
        ...privateJwk,
        kid,
        use: 'sig',
        alg: 'RS256',
      }
    ]
  };

  fs.writeFileSync(JWKS_PATH, JSON.stringify(jwks, null, 2));
  return jwks;
}

module.exports = getJwks;
