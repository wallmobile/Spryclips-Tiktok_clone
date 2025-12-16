/**
 * Admin Panel Routes Configuration
 * 
 * SECURITY: Use a complex, hard-to-guess URL path for admin panel
 * Change this value to make the admin panel URL more secure
 * 
 * IMPORTANT: After changing this, update all references in:
 * - App.tsx (routes)
 * - AdminLogin.js
 * - AdminPanel.js
 * - AdminSidebar.js
 * - All other admin components
 */

// Secure admin base path - CHANGE THIS TO YOUR OWN SECURE PATH
// Use a meaningful but hard-to-guess name (mix of descriptive words and numbers)
// Example: '/admin-control-panel-2024' or '/admin-dashboard-secure'
export const ADMIN_BASE_PATH = '/admin-control-panel-secure';

// Admin sub-routes
export const ADMIN_ROUTES = {
  LOGIN: `${ADMIN_BASE_PATH}/login`,
  DASHBOARD: ADMIN_BASE_PATH,
  POLICY_COMPLIANCE: `${ADMIN_BASE_PATH}/policy-compliance`,
  SECURITY_SETTINGS: `${ADMIN_BASE_PATH}/security-settings`,
  NOTIFICATIONS_CONTROL: `${ADMIN_BASE_PATH}/notifications-control`,
};

// Helper function to get admin route with query params
export const getAdminRoute = (path, queryParams = {}) => {
  const baseRoute = ADMIN_ROUTES[path] || ADMIN_BASE_PATH;
  if (Object.keys(queryParams).length === 0) {
    return baseRoute;
  }
  const queryString = new URLSearchParams(queryParams).toString();
  return `${baseRoute}?${queryString}`;
};

// Helper to get dashboard route with tab query
export const getAdminDashboardRoute = (tab = null) => {
  if (tab) {
    return getAdminRoute('DASHBOARD', { tab });
  }
  return ADMIN_ROUTES.DASHBOARD;
};

