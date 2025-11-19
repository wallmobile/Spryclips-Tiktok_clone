// Runtime API Configuration
// Is file ko edit karke apni backend API URL set karein
// 
// Options:
// 1. Agar backend SAME domain par hai (frontend aur backend ek hi server par):
//    API_URL: ''  (empty string rakhein)
//
// 2. Agar backend ALAG domain par hai:
//    API_URL: 'https://your-backend-domain.com'  (domain dalen, /api mat dalen)
//    Example: 'https://api.yoursite.com' ya 'https://backend.yoursite.com'
//
// 3. Agar backend localhost par test kar rahe hain:
//    API_URL: 'https://spryclips.com'
//
window.APP_CONFIG = {
  API_URL: 'https://spryclips.com' // Yahan apni backend URL dalen (empty = same domain)
};

