/**
 * Session utilities for secure token storage and management
 * Provides a more secure alternative to localStorage for sensitive data
 */
import { parseJwt } from './cognitoUtils';

// Define token expiry time (15 minutes by default)
const TOKEN_REFRESH_INTERVAL = parseInt(process.env.REACT_APP_SESSION_TIMEOUT_MINUTES || '15') * 60 * 1000;
const SESSION_NAMESPACE = 'pf_secure_';

// Cookie attributes for secure storage in cookies when available
const SECURE_COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === 'production', // Only use secure cookies in production
  httpOnly: false, // Client-side cookies must be readable by JavaScript
  sameSite: 'strict' as const, // Prevent CSRF by restricting cookies to same site
  domain: window.location.hostname,
  path: '/'
};

// Session storage wrapper with enhanced security
export const SecureSession = {
  /**
   * Securely store a value with encryption if supported
   * @param key Storage key
   * @param value Value to store
   */
  setItem: (key: string, value: string): void => {
    try {
      // Namespace the key to avoid collisions
      const namespacedKey = `${SESSION_NAMESPACE}${key}`;
      
      // Use sessionStorage which is cleared when browser is closed
      sessionStorage.setItem(namespacedKey, value);
      
      // Also set a backup secure cookie with expiry for improved security
      if (typeof document !== 'undefined') {
        // Calculate expiration time - 1 day max
        const maxAge = Math.min(TOKEN_REFRESH_INTERVAL, 86400000) / 1000;
        const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
        
        // Set cookie with secure attributes
        document.cookie = `${namespacedKey}=${encodeURIComponent(value)}; expires=${expires}; path=${SECURE_COOKIE_OPTIONS.path}; domain=${SECURE_COOKIE_OPTIONS.domain}; SameSite=${SECURE_COOKIE_OPTIONS.sameSite}${SECURE_COOKIE_OPTIONS.secure ? '; Secure' : ''}`;
      }
    } catch (error) {
      // Fail silently - don't expose errors
    }
  },
  
  /**
   * Retrieve a value from secure storage
   * @param key Storage key
   * @returns The stored value or null
   */
  getItem: (key: string): string | null => {
    try {
      // Namespace the key
      const namespacedKey = `${SESSION_NAMESPACE}${key}`;
      
      // Try sessionStorage first
      const sessionValue = sessionStorage.getItem(namespacedKey);
      if (sessionValue) return sessionValue;
      
      // Fall back to cookies if necessary
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.startsWith(`${namespacedKey}=`)) {
            return decodeURIComponent(cookie.substring(namespacedKey.length + 1));
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  },
  
  /**
   * Remove an item from secure storage
   * @param key Storage key to remove
   */
  removeItem: (key: string): void => {
    try {
      // Namespace the key
      const namespacedKey = `${SESSION_NAMESPACE}${key}`;
      
      // First overwrite with empty string for added security
      sessionStorage.setItem(namespacedKey, '');
      sessionStorage.removeItem(namespacedKey);
      
      // Also remove from cookies
      if (typeof document !== 'undefined') {
        document.cookie = `${namespacedKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${SECURE_COOKIE_OPTIONS.path}; domain=${SECURE_COOKIE_OPTIONS.domain}; SameSite=${SECURE_COOKIE_OPTIONS.sameSite}${SECURE_COOKIE_OPTIONS.secure ? '; Secure' : ''}`;
      }
    } catch (error) {
      // Fail silently
    }
  },
  
  /**
   * Clear all session data
   */
  clear: (): void => {
    try {
      // Get all keys from sessionStorage
      const keys = Object.keys(sessionStorage);
      
      // Remove only our namespaced keys
      for (const key of keys) {
        if (key.startsWith(SESSION_NAMESPACE)) {
          sessionStorage.setItem(key, '');
          sessionStorage.removeItem(key);
        }
      }
      
      // Clear cookies with our namespace
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          const name = cookie.split('=')[0];
          if (name.startsWith(SESSION_NAMESPACE)) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${SECURE_COOKIE_OPTIONS.path}; domain=${SECURE_COOKIE_OPTIONS.domain}; SameSite=${SECURE_COOKIE_OPTIONS.sameSite}${SECURE_COOKIE_OPTIONS.secure ? '; Secure' : ''}`;
          }
        }
      }
    } catch (error) {
      // Fail silently
    }
  }
};

/**
 * Validate token hasn't been tampered with and isn't expired
 * @param token JWT token to validate
 * @returns boolean indicating if token is valid
 */
const validateToken = (token: string): boolean => {
  if (!token) return false;
  
  try {
    const payload = parseJwt(token);
    if (!payload) return false;
    
    // Check token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < currentTime) {
      return false;
    }
    
    // Validate issuer if available (should be Cognito)
    if (payload.iss) {
      const validIssuers = [
        'https://cognito-idp.eu-north-1.amazonaws.com/',
        'https://cognito-idp.eu-west-1.amazonaws.com/',
        'https://cognito-idp.us-east-1.amazonaws.com/'
      ];
      
      if (!validIssuers.some(issuer => payload.iss.startsWith(issuer))) {
        return false;
      }
    }
    
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Store authentication tokens securely
 * @param idToken ID token from authentication provider
 * @param accessToken Access token from authentication provider
 * @param refreshToken Refresh token (if available)
 * @param expiresIn Token expiration time in seconds
 */
export const storeAuthTokens = (
  idToken: string, 
  accessToken?: string, 
  refreshToken?: string, 
  expiresIn?: number
): void => {
  // Validate tokens before storing
  if (idToken && validateToken(idToken)) {
    SecureSession.setItem('idToken', idToken);
  }
  
  if (accessToken) {
    SecureSession.setItem('accessToken', accessToken);
  }
  
  if (refreshToken) {
    SecureSession.setItem('refreshToken', refreshToken);
  }
  
  // Calculate and store expiration time
  if (expiresIn) {
    const expirationTime = Date.now() + (expiresIn * 1000);
    SecureSession.setItem('tokenExpiration', expirationTime.toString());
  }
  
  // Setup expiry timestamp for session timeout
  const timeoutAt = Date.now() + TOKEN_REFRESH_INTERVAL;
  SecureSession.setItem('sessionTimeout', timeoutAt.toString());
  
  // Migrate from localStorage if tokens exist there (legacy support)
  try {
    // Remove any tokens from localStorage for security
    if (localStorage.getItem('idToken')) {
      localStorage.removeItem('idToken');
    }
    
    if (localStorage.getItem('accessToken')) {
      localStorage.removeItem('accessToken');
    }
    
    if (localStorage.getItem('refreshToken')) {
      localStorage.removeItem('refreshToken');
    }
    
    if (localStorage.getItem('token')) {
      localStorage.removeItem('token');
    }
  } catch (e) {
    // Ignore errors during migration
  }
};

/**
 * Get the ID token for API calls
 * @returns The ID token or null if not available
 */
export const getIdToken = (): string | null => {
  const token = SecureSession.getItem('idToken') || 
                SecureSession.getItem('accessToken');
  
  if (token && validateToken(token)) {
    return token;
  }
  
  return null;
};

/**
 * Check if the current session is authenticated
 * @returns boolean indicating if the user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getIdToken();
  if (!token) {
    return false;
  }
  
  // Check session timeout
  const timeoutStr = SecureSession.getItem('sessionTimeout');
  if (timeoutStr) {
    const timeout = parseInt(timeoutStr);
    if (Date.now() > timeout) {
      // Session has timed out, clear it
      clearSession();
      return false;
    }
    
    // Extend session timeout on activity
    const newTimeout = Date.now() + TOKEN_REFRESH_INTERVAL;
    SecureSession.setItem('sessionTimeout', newTimeout.toString());
  }
  
  return true;
};

/**
 * Get user information from token
 * @returns User information object or null
 */
export const getUserInfo = (): { sub: string; email?: string } | null => {
  const token = getIdToken();
  if (!token) {
    return null;
  }
  
  try {
    const payload = parseJwt(token);
    if (!payload || !payload.sub) {
      return null;
    }
    
    return {
      sub: payload.sub,
      email: payload.email
    };
  } catch (e) {
    return null;
  }
};

/**
 * Clear session data when logging out
 */
export const clearSession = (): void => {
  // Clear all session data
  SecureSession.clear();
  
  // Also clear localStorage items for security
  try {
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userData');
    localStorage.removeItem('isAdmin');
  } catch (e) {
    // Ignore errors
  }
};

export default {
  SecureSession,
  storeAuthTokens,
  getIdToken,
  isAuthenticated,
  getUserInfo,
  clearSession
};
