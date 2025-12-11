// Runtime API Configuration
// Copy this file to config.js and update values for your environment
// 
// PRODUCTION CONFIGURATION:
// For production deployment with same domain (Nginx proxy):
//    API_URL: ''  (empty string - Nginx will proxy /api to backend)
//    UPLOADS_BASE_URL: 'https://yourdomain.com/uploads'
//
// LOCAL DEVELOPMENT:
//    API_URL: 'http://localhost:5000'
//    UPLOADS_BASE_URL: 'http://localhost:5000/uploads'
//
// BACKEND ON DIFFERENT DOMAIN:
//    API_URL: 'https://api.yourdomain.com'  (domain only, no /api)
//    UPLOADS_BASE_URL: 'https://api.yourdomain.com/uploads'

window.APP_CONFIG = {
  API_URL: '',  // Empty for production (Nginx proxy), 'http://localhost:5000' for local dev
  UPLOADS_BASE_URL: 'https://spryclips.com/uploads'  // Update with your domain
};

