module.exports = {
  apps: [
    {
      name: "spryclips-backend",
      script: "index.js",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        MONGO_URI: "mongodb+srv://admin:tR0hD8ODPxICuafh@ac-xotupu2.q6qrciv.mongodb.net/spryclips?retryWrites=true&w=majority"
	JWT_SECRET: "spryclips-secret-key",
        FRONTEND_URL: "https://spryclips.com",
        ALLOWED_ORIGINS: "https://spryclips.com",
        TRUST_PROXY: "true"
      }
    }
  ]
}
