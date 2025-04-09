/**
 * Central place to manage all API endpoints
 */

// Base API URL with fallback
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

// Auth endpoints
export const AUTH_ENDPOINTS = {
  signup: `${API_BASE_URL}/signup`,
  login: `${API_BASE_URL}/login`,
  confirmUser: `${API_BASE_URL}/confirm-user`,
  confirmAccount: `${API_BASE_URL}/auth/confirm`,  // Add alternate confirmation endpoint
  refreshToken: `${API_BASE_URL}/refresh-token`,
  user: `${API_BASE_URL}/user`,
  userStatus: `${API_BASE_URL}/user-status`,
};

// Admin endpoints
export const ADMIN_ENDPOINTS = {
  adminCheck: `${API_BASE_URL}/admin`,
  users: `${API_BASE_URL}/admin/users`,
  user: (userId: string) => `${API_BASE_URL}/admin/users/${userId}`,
  userAccess: (userId: string) => `${API_BASE_URL}/admin/users/${userId}/access`,
  companies: `${API_BASE_URL}/admin/companies`,
};

// Booking endpoints
export const BOOKING_ENDPOINTS = {
  bookings: `${API_BASE_URL}/bookings`,
  booking: (bookingId: string) => `${API_BASE_URL}/bookings/${bookingId}`,
  userBookings: `${API_BASE_URL}/bookings/user`,
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
  BOOKING_ENDPOINTS,
  getEndpoint,
};
