// Runtime API Configuration
// Is file ko edit karke apni backend API URL set karein
// 
// PRODUCTION CONFIGURATION:
// For spryclips.com deployment, set empty string for API_URL
// Uploads will be served from: https://spryclips.com/uploads
// 
// Options:
// 1. Production (same domain with Nginx proxy):
//    API_URL: ''  (empty string - Nginx will proxy /api to backend)
//
// 2. Backend on different domain:
//    API_URL: 'https://your-backend-domain.com'  (domain dalen, /api mat dalen)
//    Example: 'https://api.yoursite.com' ya 'https://backend.yoursite.com'
//
// 3. Local development:
//    API_URL: 'http://localhost:5000'
//
window.APP_CONFIG = {
  API_URL: 'http://localhost:5000',  // Local development
  // Public uploads base URL - videos/images will be loaded from here
  UPLOADS_BASE_URL: 'http://localhost:5000/uploads'  // Local development: 'http://localhost:5000/uploads'
};
