/**
 * Central place to manage all API endpoints
 */

// API base URL - use environment variable with fallback
export const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Authentication endpoints
export const AUTH_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/login`,
  register: `${API_BASE_URL}/auth/register`,
  confirmAccount: `${API_BASE_URL}/auth/confirm`,
  forgotPassword: `${API_BASE_URL}/auth/forgot-password`,
  resetPassword: `${API_BASE_URL}/auth/reset-password`,
  validateToken: `${API_BASE_URL}/auth/validate-token`,
};

// Admin endpoints
export const ADMIN_ENDPOINTS = {
  // Base endpoints
  users: `${API_BASE_URL}/admin/users`,
  bookings: `${API_BASE_URL}/admin/bookings`,
  companies: `${API_BASE_URL}/admin/companies`,
  assets: `${API_BASE_URL}/admin/assets`,
  resources: `${API_BASE_URL}/admin/resources`,
  reports: `${API_BASE_URL}/admin/reports`,
  settings: `${API_BASE_URL}/admin/settings`,
  
  // Functions for specific resources
  user: (userId: string) => `${API_BASE_URL}/admin/users/${userId}`,
  userAccess: (userId: string) => `${API_BASE_URL}/admin/users/${userId}/access`,
  booking: (bookingId: string) => `${API_BASE_URL}/admin/bookings/${bookingId}`,
  company: (companyId: string) => `${API_BASE_URL}/admin/companies/${companyId}`,
  asset: (assetId: string) => `${API_BASE_URL}/admin/assets/${assetId}`,
  resource: (resourceId: string) => `${API_BASE_URL}/admin/resources/${resourceId}`,
};

// User endpoints
export const USER_ENDPOINTS = {
  profile: `${API_BASE_URL}/user/profile`,
  bookings: `${API_BASE_URL}/user/bookings`,
};

// Asset endpoints
export const ASSET_ENDPOINTS = {
  list: `${API_BASE_URL}/assets`,
  detail: (id: string) => `${API_BASE_URL}/assets/${id}`,
};

// Logging helper for debugging API calls
export const logEndpoint = (name: string, url: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Using API endpoint ${name}: ${url}`);
  }
};

// Export a function to get any endpoint with logging
export const getEndpoint = (endpoint: string, params: Record<string, string> = {}): string => {
  let url = API_BASE_URL;
  
  // Add endpoint path (ensure it starts with /)
  if (!endpoint.startsWith('/')) {
    url += '/';
  }
  url += endpoint;
  
  // Add query parameters if any
  if (Object.keys(params).length > 0) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    
    url += `?${queryString}`;
  }
  
  logEndpoint(endpoint, url);
  return url;
};

export default {
  API_BASE_URL,
  AUTH_ENDPOINTS,
  ADMIN_ENDPOINTS,
  USER_ENDPOINTS,
  ASSET_ENDPOINTS,
  getEndpoint,
};
