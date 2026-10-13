/**
 * Admin Panel Routes Configuration
 * 
 * SECURITY: Use a complex, hard-to-guess URL path for admin panel
 * Change this value to make the admin panel URL more secure
 */

// Secure admin base path
const ADMIN_BASE_PATH = '/admin-control-panel-secure';

// Admin sub-routes
const ADMIN_ROUTES = {
  LOGIN: `${ADMIN_BASE_PATH}/login`,
  DASHBOARD: ADMIN_BASE_PATH,
  POLICY_COMPLIANCE: `${ADMIN_BASE_PATH}/policy-compliance`,
  SECURITY_SETTINGS: `${ADMIN_BASE_PATH}/security-settings`,
  NOTIFICATIONS_CONTROL: `${ADMIN_BASE_PATH}/notifications-control`,
};

// Helper function to get admin route with query params
const getAdminRoute = (path, queryParams = {}) => {
  const baseRoute = ADMIN_ROUTES[path] || ADMIN_BASE_PATH;

  if (Object.keys(queryParams).length === 0) {
    return baseRoute;
  }

  const queryString = new URLSearchParams(queryParams).toString();
  return `${baseRoute}?${queryString}`;
};

// Helper to get dashboard route with tab query
const getAdminDashboardRoute = (tab = null) => {
  if (tab) {
    return getAdminRoute('DASHBOARD', { tab });
  }
  return ADMIN_ROUTES.DASHBOARD;
};

module.exports = {
  ADMIN_BASE_PATH,
  ADMIN_ROUTES,
  getAdminRoute,
  getAdminDashboardRoute,
};
