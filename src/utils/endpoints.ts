/**
 * Centralized API endpoints configuration
 * This helps avoid hardcoded URLs throughout the application
 */

// Base API URL from environment variables or default fallback
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

// Security configuration
const SECURITY_CONFIG = {
  ENFORCE_HTTPS: process.env.REACT_APP_ENFORCE_HTTPS === 'true' || process.env.NODE_ENV === 'production'
};

/**
 * Get API URL with correct protocol based on environment
 * @param endpoint The API endpoint path
 * @returns The full URL with correct protocol
 */
const getSecureUrl = (endpoint: string): string => {
  let url = API_BASE_URL;
  
  // Force HTTPS in production or if explicitly configured
  if (SECURITY_CONFIG.ENFORCE_HTTPS && url.startsWith('http:')) {
    url = url.replace('http:', 'https:');
  }
  
  // Ensure endpoint starts with '/'
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${url}${normalizedEndpoint}`;
};

// Admin API endpoints
export const ADMIN_ENDPOINTS = {
  USERS: '/admin/users',
  COMPANIES: '/admin/companies',
  RESOURCES: '/admin/resources',
  BOOKINGS: '/admin/bookings'
};

// Auth API endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  RESET_PASSWORD: '/auth/reset-password',
  CONFIRM_RESET: '/auth/confirm-reset',
  REFRESH_TOKEN: '/auth/refresh',
  LOGOUT: '/auth/logout'
};

// User API endpoints
export const USER_ENDPOINTS = {
  PROFILE: '/user/profile',
  SETTINGS: '/user/settings',
  BOOKINGS: '/user/bookings'
};

// Resource API endpoints
export const RESOURCE_ENDPOINTS = {
  LIST: '/resources',
  DETAILS: '/resources/details',
  AVAILABILITY: '/resources/availability',
  BOOK: '/resources/book'
};

// Booking API endpoints
export const BOOKING_ENDPOINTS = {
  CREATE: '/bookings/create',
  UPDATE: '/bookings/update',
  CANCEL: '/bookings/cancel',
  LIST: '/bookings'
};

// Security endpoints
export const SECURITY_ENDPOINTS = {
  VALIDATE_TOKEN: '/auth/validate',
  CSRF_TOKEN: '/auth/csrf'
};

// Allowed HTTP methods for each endpoint group (for extra security)
export const ALLOWED_METHODS = {
  ADMIN: {
    USERS: ['GET', 'POST', 'PUT', 'DELETE'],
    COMPANIES: ['GET', 'POST', 'PUT', 'DELETE'],
    RESOURCES: ['GET', 'POST', 'PUT', 'DELETE'],
    BOOKINGS: ['GET', 'PUT', 'DELETE']
  },
  USER: {
    PROFILE: ['GET', 'PUT'],
    SETTINGS: ['GET', 'PUT'],
    BOOKINGS: ['GET', 'POST', 'PUT', 'DELETE']
  }
};

/**
 * Validate API method is allowed for a specific endpoint
 * Helps prevent CSRF by restricting methods
 * 
 * @param endpoint The API endpoint
 * @param method The HTTP method
 * @returns Boolean indicating if the method is allowed
 */
export const isMethodAllowed = (endpoint: string, method: string): boolean => {
  // Always allow GET for all endpoints as it's safe
  if (method === 'GET') return true;
  
  // Special validation for admin endpoints
  if (endpoint.startsWith('/admin/')) {
    const resource = endpoint.split('/')[2]; // Extract resource name
    if (resource && ALLOWED_METHODS.ADMIN[resource.toUpperCase() as keyof typeof ALLOWED_METHODS.ADMIN]) {
      return ALLOWED_METHODS.ADMIN[resource.toUpperCase() as keyof typeof ALLOWED_METHODS.ADMIN]
        .includes(method);
    }
  }
  
  // Handle user endpoints
  if (endpoint.startsWith('/user/')) {
    const resource = endpoint.split('/')[2];
    if (resource && ALLOWED_METHODS.USER[resource.toUpperCase() as keyof typeof ALLOWED_METHODS.USER]) {
      return ALLOWED_METHODS.USER[resource.toUpperCase() as keyof typeof ALLOWED_METHODS.USER]
        .includes(method);
    }
  }
  
  // Default to false for security
  return false;
};

// Logging utility for debugging API calls
export const logEndpoint = (endpoint: string, method: string = 'GET'): void => {
  // Only log in development environment
  if (process.env.NODE_ENV === 'development') {
    const secureUrl = getSecureUrl(endpoint);
    // Don't log sensitive data
    const sanitizedUrl = secureUrl.replace(/token=[^&]+/, 'token=REDACTED')
                                 .replace(/password=[^&]+/, 'password=REDACTED');
    console.info(`API ${method} Request to: ${sanitizedUrl}`);
  }
};

/**
 * Get full URL for API endpoint
 * @param endpoint API endpoint path
 * @returns Full URL with correct protocol
 */
export const getFullUrl = (endpoint: string): string => {
  return getSecureUrl(endpoint);
};

export default {
  API_BASE_URL,
  ADMIN_ENDPOINTS,
  AUTH_ENDPOINTS,
  USER_ENDPOINTS,
  RESOURCE_ENDPOINTS,
  BOOKING_ENDPOINTS,
  SECURITY_ENDPOINTS,
  logEndpoint,
  isMethodAllowed,
  getFullUrl
};
