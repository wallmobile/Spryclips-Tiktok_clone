module.exports = {
  apps: [
    {
      name: "spryclips-backend",
      script: "index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
        MONGODB_URI: "mongodb+srv://admin:tR0hD8ODPxICuafh@ac-xotupu2.q6qrciv.mongodb.net/spryclips?retryWrites=true&w=majority",
        JWT_SECRET: "spryclips-secret-key",
        FRONTEND_URL: "https://spryclips.com",
        ALLOWED_ORIGINS: "https://spryclips.com,https://www.spryclips.com,http://spryclips.com,http://www.spryclips.com,https://spryclip.com,https://www.spryclip.com",
        TRUST_PROXY: "true",
        UPLOADS_DIR: "/home/reactmaster/uploads"
      }
    }
  ]
}
