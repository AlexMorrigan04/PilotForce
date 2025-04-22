/**
 * Enhanced session persistence utilities
 * This provides a unified approach to storing and retrieving auth tokens
 * with support for both localStorage and sessionStorage for redundancy
 */

// Import token debugging utilities
import { isTokenExpired, getTokenInfo, shouldRefreshToken } from './tokenDebugger';

// Define storage keys used across the application
const STORAGE_KEYS = {
  ID_TOKEN: 'idToken',
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'user',
  AUTH_HEADER: 'authHeader',
  AUTH_USERNAME: 'auth_username',
  AUTH_PASSWORD: 'auth_password',
  TOKENS: 'tokens',
  SESSION_TIMESTAMP: 'pilotforce_session_timestamp',
  SESSION_EXPIRY: 'pilotforce_session_expiry',
  SESSION_ACTIVE: 'pilotforce_session_active',
};

/**
 * Store authentication tokens in both localStorage and sessionStorage
 * for redundancy. This ensures tokens survive page refreshes and
 * having multiple tabs open.
 */
export const storeAuthTokens = (
  idToken: string | null,
  refreshToken: string | null,
  accessToken: string | null,
  userData?: any
): void => {
  // Store ID token in both storage types if provided
  if (idToken) {
    localStorage.setItem(STORAGE_KEYS.ID_TOKEN, idToken);
    try {
      sessionStorage.setItem(STORAGE_KEYS.ID_TOKEN, idToken);
    } catch (e) {
      console.warn('Failed to set item in sessionStorage:', e);
    }
  }
  
  // Store refresh token in both storage types if provided
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    try {
      sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } catch (e) {
      console.warn('Failed to set refresh token in sessionStorage:', e);
    }
  }
  
  // Store access token in both storage types if provided
  if (accessToken) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    try {
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    } catch (e) {
      console.warn('Failed to set access token in sessionStorage:', e);
    }
  }
  
  // Store all tokens as a single object for convenience
  if (idToken || refreshToken || accessToken) {
    const tokens = {
      idToken: idToken || localStorage.getItem(STORAGE_KEYS.ID_TOKEN) || '',
      refreshToken: refreshToken || localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || '',
      accessToken: accessToken || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || '',
    };
    
    localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
    try {
      sessionStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
    } catch (e) {
      console.warn('Failed to set tokens object in sessionStorage:', e);
    }
  }
  
  // Store user data if provided
  if (userData) {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    try {
      sessionStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } catch (e) {
      console.warn('Failed to set user data in sessionStorage:', e);
    }
  }
  
  // Update session timestamp
  const now = Date.now().toString();
  localStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, now);
  try {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, now);
  } catch (e) {
    console.warn('Failed to set session timestamp in sessionStorage:', e);
  }
  
  // Mark session as active
  localStorage.setItem(STORAGE_KEYS.SESSION_ACTIVE, 'true');
  try {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_ACTIVE, 'true');
  } catch (e) {
    console.warn('Failed to set session active flag in sessionStorage:', e);
  }
  
  // If we have an ID token, calculate and store its expiry
  if (idToken) {
    try {
      const tokenInfo = getTokenInfo(idToken);
      if (tokenInfo.expiresAt) {
        localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, tokenInfo.expiresAt.toISOString());
        try {
          sessionStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, tokenInfo.expiresAt.toISOString());
        } catch (e) {
          console.warn('Failed to set session expiry in sessionStorage:', e);
        }
      }
    } catch (e) {
      console.error('Error calculating token expiry:', e);
    }
  }
};

/**
 * Get authentication token with fallback logic
 * First checks sessionStorage, then localStorage
 */
export const getAuthToken = (): string | null => {
  // Try to get from sessionStorage first (might be more up-to-date)
  let token: string | null = null;
  
  try {
    token = sessionStorage.getItem(STORAGE_KEYS.ID_TOKEN);
  } catch (e) {
    console.warn('Error accessing sessionStorage:', e);
  }
  
  // Fall back to localStorage if not in sessionStorage
  if (!token) {
    token = localStorage.getItem(STORAGE_KEYS.ID_TOKEN);
  }
  
  // If still no token, check the full tokens object
  if (!token) {
    try {
      const tokensStr = localStorage.getItem(STORAGE_KEYS.TOKENS) || sessionStorage.getItem(STORAGE_KEYS.TOKENS);
      if (tokensStr) {
        const tokens = JSON.parse(tokensStr);
        if (tokens.idToken) return tokens.idToken;
      }
    } catch (e) {
      console.error('Error parsing tokens object:', e);
    }
  }
  
  return token;
};

/**
 * Get refresh token with fallback logic
 */
export const getRefreshToken = (): string | null => {
  // Try to get from sessionStorage first (might be more up-to-date)
  let token: string | null = null;
  
  try {
    token = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (e) {
    console.warn('Error accessing sessionStorage:', e);
  }
  
  // Fall back to localStorage if not in sessionStorage
  if (!token) {
    token = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }
  
  // If still no token, check the full tokens object
  if (!token) {
    try {
      const tokensStr = localStorage.getItem(STORAGE_KEYS.TOKENS) || sessionStorage.getItem(STORAGE_KEYS.TOKENS);
      if (tokensStr) {
        const tokens = JSON.parse(tokensStr);
        if (tokens.refreshToken) return tokens.refreshToken;
      }
    } catch (e) {
      console.error('Error parsing tokens object:', e);
    }
  }
  
  return token;
};

/**
 * Get access token with fallback logic
 */
export const getAccessToken = (): string | null => {
  // Try to get from sessionStorage first (might be more up-to-date)
  let token: string | null = null;
  
  try {
    token = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (e) {
    console.warn('Error accessing sessionStorage:', e);
  }
  
  // Fall back to localStorage if not in sessionStorage
  if (!token) {
    token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }
  
  // If still no token, check the full tokens object
  if (!token) {
    try {
      const tokensStr = localStorage.getItem(STORAGE_KEYS.TOKENS) || sessionStorage.getItem(STORAGE_KEYS.TOKENS);
      if (tokensStr) {
        const tokens = JSON.parse(tokensStr);
        if (tokens.accessToken) return tokens.accessToken;
      }
    } catch (e) {
      console.error('Error parsing tokens object:', e);
    }
  }
  
  return token;
};

/**
 * Get user data from storage with fallback logic
 */
export const getStoredUserData = (): any | null => {
  let userDataStr: string | null = null;
  
  // Try sessionStorage first
  try {
    userDataStr = sessionStorage.getItem(STORAGE_KEYS.USER_DATA);
  } catch (e) {
    console.warn('Error accessing sessionStorage for user data:', e);
  }
  
  // Fall back to localStorage
  if (!userDataStr) {
    userDataStr = localStorage.getItem(STORAGE_KEYS.USER_DATA);
  }
  
  // Parse and return the user data
  if (userDataStr) {
    try {
      return JSON.parse(userDataStr);
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
  
  return null;
};

/**
 * Check if a user is authenticated based on stored tokens
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;
  
  // Check if token is expired
  return !isTokenExpired(token);
};

/**
 * Check if the session needs to be refreshed based on token expiration
 */
export const needsSessionRefresh = (): boolean => {
  const token = getAuthToken();
  return shouldRefreshToken(token);
};

/**
 * Initialize session based on stored data
 * @returns Object containing authentication status and user data
 */
export const initializeSession = (): { 
  isAuthenticated: boolean; 
  userData: any | null;
  token: string | null;
  refreshToken: string | null;
} => {
  // Check for token
  const token = getAuthToken();
  const refreshToken = getRefreshToken();
  const userData = getStoredUserData();
  
  // Update session timestamp to mark current activity
  const now = Date.now().toString();
  localStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, now);
  try {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, now);
  } catch (e) {
    console.warn('Failed to update session timestamp in sessionStorage:', e);
  }
  
  // Set session active flag
  if (token) {
    localStorage.setItem(STORAGE_KEYS.SESSION_ACTIVE, 'true');
    try {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_ACTIVE, 'true');
    } catch (e) {
      console.warn('Failed to set session active flag in sessionStorage:', e);
    }
  }
  
  return {
    isAuthenticated: token ? !isTokenExpired(token) : false,
    userData,
    token,
    refreshToken
  };
};

/**
 * Completely clear all auth-related data from storage
 * Used for logout and session invalidation
 */
export const clearAuthData = (): void => {
  // Clear all auth-related items from localStorage
  localStorage.removeItem(STORAGE_KEYS.ID_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  localStorage.removeItem(STORAGE_KEYS.AUTH_USERNAME);
  localStorage.removeItem(STORAGE_KEYS.AUTH_PASSWORD);
  localStorage.removeItem(STORAGE_KEYS.AUTH_HEADER);
  localStorage.removeItem(STORAGE_KEYS.TOKENS);
  localStorage.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);
  localStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRY);
  localStorage.removeItem(STORAGE_KEYS.SESSION_ACTIVE);
  
  // Also clear from sessionStorage if available
  try {
    sessionStorage.removeItem(STORAGE_KEYS.ID_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER_DATA);
    sessionStorage.removeItem(STORAGE_KEYS.TOKENS);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRY);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_ACTIVE);
  } catch (e) {
    console.warn('Error clearing sessionStorage:', e);
  }
};

export default {
  storeAuthTokens,
  getAuthToken,
  getRefreshToken,
  getAccessToken,
  getStoredUserData,
  isAuthenticated,
  needsSessionRefresh,
  clearAuthData,
  initializeSession,
};