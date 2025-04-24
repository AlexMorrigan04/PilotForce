import { jwtDecode } from "jwt-decode";
import { SecureSession } from './sessionUtils';
import * as endpoints from './endpoints';

// Define environment config using constants to avoid hardcoded values
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || endpoints.API_BASE_URL,
  ADMIN_CHECK_ENDPOINT: '/admin',
  TOKEN_VALIDATION: {
    ISSUER_WHITELIST: [
      'https://cognito-idp.eu-north-1.amazonaws.com/',
      'https://cognito-idp.eu-west-1.amazonaws.com/',
      'https://cognito-idp.us-east-1.amazonaws.com/'
    ]
  }
};

// More strongly typed interface for decoded tokens
interface DecodedToken {
  'cognito:groups'?: string[];
  'custom:role'?: string;
  'custom:userRole'?: string;
  role?: string;
  sub: string;
  email_verified: boolean;
  iss: string;
  'cognito:username': string;
  origin_jti: string;
  aud: string;
  event_id: string;
  token_use: string;
  auth_time: number;
  exp: number;
  iat: number;
  jti: string;
  email: string;
}

// List of valid admin roles for consistent checking
const VALID_ADMIN_ROLES = [
  'admin',
  'administrator',
  'systemadmin',
  'companyadmin'
];

// List of valid admin groups
const VALID_ADMIN_GROUPS = [
  'administrators',
  'admins',
  'admin',
  'administrator'
];

/**
 * Validates a JWT token hasn't expired and is from a trusted issuer
 * 
 * @param decodedToken The decoded JWT token
 * @returns boolean indicating if token is still valid
 */
const isTokenValid = (decodedToken: DecodedToken): boolean => {
  if (!decodedToken.exp) {
    return false;
  }
  
  // Check if token is expired (exp is in seconds, Date.now() in milliseconds)
  const currentTime = Math.floor(Date.now() / 1000);
  if (decodedToken.exp <= currentTime) {
    return false;
  }

  // Validate the issuer is in our whitelist
  const issuer = decodedToken.iss;
  if (!issuer || !API_CONFIG.TOKEN_VALIDATION.ISSUER_WHITELIST.some(trusted => 
    issuer.startsWith(trusted))) {
    return false;
  }
  
  return true;
};

/**
 * Check if a user is an admin based on their ID token
 * Uses the cognito:groups claim to determine admin status
 * 
 * @param idToken JWT token from Cognito
 * @returns boolean indicating if the user is an admin
 */
export const isAdminFromToken = (idToken: string): boolean => {
  try {
    if (!idToken || typeof idToken !== 'string') return false;
    
    const decodedToken = jwtDecode<DecodedToken>(idToken);
    
    // First check if token is valid
    if (!isTokenValid(decodedToken)) {
      return false;
    }
    
    // Check if the user is in the admin group
    const groups = decodedToken['cognito:groups'] || [];
    
    // Check for admin in groups
    const isAdminGroup = groups.some((group: string) => 
      VALID_ADMIN_GROUPS.includes(group.toLowerCase())
    );
    
    // Check for admin in role fields
    const userRole = decodedToken['custom:role'] || 
                    decodedToken['custom:userRole'] || 
                    decodedToken.role;
    
    // Check if role is an admin role
    const isAdminRole = userRole && VALID_ADMIN_ROLES.includes(userRole.toLowerCase());
    
    const result = Boolean(isAdminGroup || isAdminRole);
    
    // Store result in sessionStorage to persist, but only if admin
    if (result) {
      SecureSession.setItem('isAdmin', 'true');
    }
    
    return result;
  } catch (error) {
    // Security: Don't expose error details, just return false
    return false;
  }
};

/**
 * Safely retrieves auth token from storage
 * 
 * @returns string | null - The auth token if available
 */
const getAuthToken = (): string | null => {
  // Try to get token from secure session first
  let token = SecureSession.getItem('idToken') || 
              SecureSession.getItem('accessToken') || 
              SecureSession.getItem('token');
  
  // Fall back to localStorage only if needed (legacy support)
  if (!token) {
    token = localStorage.getItem('idToken') || 
            localStorage.getItem('accessToken') || 
            localStorage.getItem('token');
    
    // If found in localStorage, move to SecureSession and clear localStorage
    if (token) {
      SecureSession.setItem('idToken', token);
      try {
        localStorage.removeItem('idToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
      } catch (e) {
        // Silent failure - don't expose errors
      }
    }
  }
  
  return token;
};

/**
 * Safely parses and validates user data from storage
 * 
 * @returns object | null - User data if available and valid
 */
const getUserData = (): any | null => {
  try {
    // Try SecureSession first
    let userDataStr = SecureSession.getItem('userData');
    
    // Fall back to localStorage if needed (legacy support)
    if (!userDataStr) {
      userDataStr = localStorage.getItem('user') || localStorage.getItem('userData');
      
      // If found in localStorage, move to SecureSession and clear localStorage
      if (userDataStr) {
        SecureSession.setItem('userData', userDataStr);
        try {
          localStorage.removeItem('user');
          localStorage.removeItem('userData');
        } catch (e) {
          // Silent failure - don't expose errors
        }
      }
    }
    
    if (!userDataStr) return null;
    
    // Safely parse JSON with validation
    const userData = JSON.parse(userDataStr);
    if (typeof userData !== 'object' || userData === null) {
      return null;
    }
    
    return userData;
  } catch (e) {
    return null;
  }
};

/**
 * Verify admin status by calling the backend API
 * More secure than client-side verification
 * 
 * @returns Promise<boolean> indicating if the current user is an admin
 */
export const checkAdminStatus = async (): Promise<boolean> => {
  try {
    const token = getAuthToken();
    
    if (!token) {
      // Check if we have user data with role information
      const userData = getUserData();
      if (userData) {
        const role = userData.role || userData.userRole || userData.UserRole;
        
        if (role && VALID_ADMIN_ROLES.includes(role.toLowerCase())) {
          SecureSession.setItem('isAdmin', 'true');
          return true;
        }
      }
      
      return false;
    }
    
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ADMIN_CHECK_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // Anti-CSRF header
        'Cache-Control': 'no-store' // Prevent response caching
      },
      credentials: 'same-origin', // Ensure cookies are sent with request
      cache: 'no-store' // Prevent request caching
    });
    
    if (!response.ok) {
      // Clear admin status if server rejects it
      SecureSession.removeItem('isAdmin');
      return false;
    }
    
    const data = await response.json();
    
    // Store the admin status in secure storage
    if (data.isAdmin === true) {
      SecureSession.setItem('isAdmin', 'true');
    } else {
      SecureSession.removeItem('isAdmin');
    }
    
    return data.isAdmin === true;
  } catch (error) {
    // Clear admin status on errors
    SecureSession.removeItem('isAdmin');
    return false;
  }
};

/**
 * Gets the current user's role from storage or token
 * 
 * @returns string representing user role ('Admin', 'User', etc.)
 */
export const getCurrentUserRole = (): string => {
  try {
    // Try to get from secure storage first
    const userData = getUserData();
    if (userData && (userData.role || userData.userRole || userData.UserRole)) {
      return userData.role || userData.userRole || userData.UserRole;
    }
    
    // If not in storage, try from token
    const idToken = getAuthToken();
    
    if (idToken) {
      const decodedToken = jwtDecode<DecodedToken>(idToken);
      
      // Check token validity first
      if (!isTokenValid(decodedToken)) {
        return 'User';
      }
      
      // Return the role from token
      return decodedToken['custom:userRole'] || 
             decodedToken['custom:role'] || 
             decodedToken.role || 
             'User';
    }
    
    return 'User'; // Default to User role
  } catch (error) {
    return 'User';
  }
};

/**
 * Call an admin API endpoint with authorization
 * 
 * @param endpoint The API endpoint path (e.g., '/admin/users')
 * @param method HTTP method (GET, POST, PUT, DELETE)
 * @param data Optional data to send with request
 * @returns Promise with the API response
 */
export const callAdminApi = async (endpoint: string, method: string = 'GET', data: any = null): Promise<any> => {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    // Ensure endpoint starts with '/'
    const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_CONFIG.BASE_URL}${sanitizedEndpoint}`;
    
    // Set up security headers
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // Anti-CSRF header
      'Cache-Control': 'no-store', // Security best practice - prevent caching of sensitive data
      'Pragma': 'no-cache'
    };
    
    // Add Content-Security-Policy header for extra protection when supported
    if (method === 'GET') {
      headers['Content-Security-Policy'] = "default-src 'self'";
    }
    
    const options: RequestInit = {
      method,
      headers,
      credentials: 'same-origin', // Ensure cookies are sent with request
      cache: 'no-store', // Prevent response caching
      referrerPolicy: 'strict-origin-when-cross-origin' // Limit referrer information
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      // Sanitize input data by removing any script tags or potentially dangerous content
      const sanitizedData = JSON.stringify(data)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '');
        
      options.body = sanitizedData;
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const status = response.status;
      throw new Error(`API error (${status})`);
    }
    
    // For added security, validate response content-type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format');
    }
    
    return await response.json();
  } catch (error) {
    throw new Error('API request failed'); // Sanitize error message to avoid leaking implementation details
  }
};

/**
 * Check if the user is an admin based on secure storage
 * @returns boolean indicating if the user is an admin
 */
export const isAdminLocally = (): boolean => {
  // Check for admin status in secure storage
  if (SecureSession.getItem('isAdmin') === 'true') {
    return true;
  }
  
  // Check user data
  const userData = getUserData();
  if (userData) {
    const role = userData.role || userData.userRole || userData.UserRole;
    
    if (role && VALID_ADMIN_ROLES.includes(role.toLowerCase())) {
      return true;
    }
  }
  
  return false;
};

export default {
  isAdminFromToken,
  checkAdminStatus,
  getCurrentUserRole,
  callAdminApi,
  isAdminLocally
};
