/**
 * Authentication Debugger
 * 
 * This utility provides functions to debug authentication issues and
 * fix token storage and retrieval problems.
 */

import { jwtDecode } from 'jwt-decode';
import { getUserInfo, getUserRole, isAdminLocally, isCompanyAdminLocally, isUserRoleLocally } from './authProxy';

// Log the current state of authentication across all storage locations
export const logAuthState = () => {
  const authState: {[key: string]: any} = {
    localStorage: {
      idToken: null,
      accessToken: null,
      refreshToken: null,
      isAdmin: null,
      hasUserData: false,
      hasUserCognitoDetails: false,
      hasTokens: false,
      pilotforceSessionActive: null,
      pilotforceSessionTimestamp: null
    },
    sessionStorage: {}
  };

  // Safely try to get values from localStorage
  try {
    const idToken = localStorage.getItem('idToken');
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    authState.localStorage = {
      idToken: idToken ? (idToken.length > 30 ? idToken.substring(0, 15) + '...' : idToken) : 'Not found',
      accessToken: accessToken ? (accessToken.length > 30 ? accessToken.substring(0, 15) + '...' : accessToken) : 'Not found',
      refreshToken: refreshToken ? (refreshToken.length > 30 ? refreshToken.substring(0, 15) + '...' : refreshToken) : 'Not found',
      isAdmin: localStorage.getItem('isAdmin'),
      hasUserData: !!localStorage.getItem('user'),
      hasUserCognitoDetails: !!localStorage.getItem('userCognitoDetails'),
      hasTokens: !!localStorage.getItem('tokens'),
      pilotforceSessionActive: localStorage.getItem('pilotforce_session_active'),
      pilotforceSessionTimestamp: localStorage.getItem('pilotforce_session_timestamp')
    };
  } catch (e) {
  }

  // Safely access sessionStorage
  try {
    const ssIdToken = sessionStorage.getItem('idToken');
    const ssAccessToken = sessionStorage.getItem('accessToken');
    const ssRefreshToken = sessionStorage.getItem('refreshToken');
    
    authState.sessionStorage = {
      idToken: ssIdToken ? (ssIdToken.length > 30 ? ssIdToken.substring(0, 15) + '...' : ssIdToken) : 'Not found',
      accessToken: ssAccessToken ? (ssAccessToken.length > 30 ? ssAccessToken.substring(0, 15) + '...' : ssAccessToken) : 'Not found',
      refreshToken: ssRefreshToken ? (ssRefreshToken.length > 30 ? ssRefreshToken.substring(0, 15) + '...' : ssRefreshToken) : 'Not found',
      hasUserData: !!sessionStorage.getItem('user'),
      hasUserCognitoDetails: !!sessionStorage.getItem('userCognitoDetails'),
      hasTokens: !!sessionStorage.getItem('tokens')
    };
  } catch (e) {
    authState.sessionStorage = { error: 'Failed to access sessionStorage' };
  }
  return authState;
};

// Fix missing token issues by syncing tokens across storage locations
export const syncAuthTokensAcrossStorage = () => {
  try {
    // Log before state
    logAuthState();

    // 1. First check localStorage for tokens
    const lsIdToken = localStorage.getItem('idToken');
    const lsAccessToken = localStorage.getItem('accessToken');
    const lsRefreshToken = localStorage.getItem('refreshToken');
    
    // 2. Then check sessionStorage for tokens
    let ssIdToken = null;
    let ssAccessToken = null;
    let ssRefreshToken = null;
    
    try {
      ssIdToken = sessionStorage.getItem('idToken');
      ssAccessToken = sessionStorage.getItem('accessToken');
      ssRefreshToken = sessionStorage.getItem('refreshToken');
    } catch (e) {
    }
    
    // 3. Check JSON token objects
    let tokensObjIdToken = null;
    let tokensObjAccessToken = null;
    let tokensObjRefreshToken = null;
    
    try {
      const tokensStr = localStorage.getItem('tokens');
      if (tokensStr) {
        const tokensObj = JSON.parse(tokensStr);
        tokensObjIdToken = tokensObj.idToken;
        tokensObjAccessToken = tokensObj.accessToken;
        tokensObjRefreshToken = tokensObj.refreshToken;
      }
    } catch (e) {
    }
    
    // 4. Check Cognito details
    let cognitoIdToken = null;
    
    try {
      const cognitoDetailsStr = localStorage.getItem('userCognitoDetails');
      if (cognitoDetailsStr) {
        const cognitoDetails = JSON.parse(cognitoDetailsStr);
        cognitoIdToken = cognitoDetails.idToken || cognitoDetails.fullToken?.token;
      }
    } catch (e) {
    }
    
    // 5. Determine the best tokens to use (prioritize localStorage)
    const bestIdToken = lsIdToken || ssIdToken || tokensObjIdToken || cognitoIdToken;
    const bestAccessToken = lsAccessToken || ssAccessToken || tokensObjAccessToken;
    const bestRefreshToken = lsRefreshToken || ssRefreshToken || tokensObjRefreshToken;
    
    // 6. If we have tokens, sync them to all locations
    if (bestIdToken) {
      localStorage.setItem('idToken', bestIdToken);
      try { sessionStorage.setItem('idToken', bestIdToken); } catch (e) {}
    }
    
    if (bestAccessToken) {
      localStorage.setItem('accessToken', bestAccessToken);
      try { sessionStorage.setItem('accessToken', bestAccessToken); } catch (e) {}
    }
    
    if (bestRefreshToken) {
      localStorage.setItem('refreshToken', bestRefreshToken);
      try { sessionStorage.setItem('refreshToken', bestRefreshToken); } catch (e) {}
    }
    
    // 7. Sync to tokens object
    if (bestIdToken || bestAccessToken || bestRefreshToken) {
      const tokens = {
        idToken: bestIdToken || null,
        accessToken: bestAccessToken || null,
        refreshToken: bestRefreshToken || null
      };
      
      localStorage.setItem('tokens', JSON.stringify(tokens));
      try { sessionStorage.setItem('tokens', JSON.stringify(tokens)); } catch (e) {}
    }
    
    // Log after state
    return logAuthState();
  } catch (e) {
    return null;
  }
};

// Debug token decoding
export const decodeToken = (token: string | null) => {
  if (!token) {
    return { 
      valid: false, 
      message: 'No token provided' 
    };
  }
  
  try {
    // Basic format check
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { 
        valid: false, 
        message: 'Token is not in valid JWT format (should have 3 parts)' 
      };
    }
    
    // Decode header
    const header = JSON.parse(atob(parts[0]));
    
    // Decode payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp && payload.exp < now;
    
    return {
      valid: true,
      header,
      payload,
      isExpired,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'No expiration',
      remainingTime: payload.exp ? Math.floor((payload.exp - now) / 60) + ' minutes' : 'N/A'
    };
  } catch (e) {
    return {
      valid: false,
      message: 'Failed to decode token: ' + (e as Error).message
    };
  }
};

// Get current active token
export const getCurrentToken = () => {
  const idToken = localStorage.getItem('idToken');
  if (idToken) {
    const decoded = decodeToken(idToken);
    return {
      token: idToken,
      source: 'localStorage.idToken',
      decoded
    };
  }
  
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    const decoded = decodeToken(accessToken);
    return {
      token: accessToken,
      source: 'localStorage.accessToken',
      decoded
    };
  }
  
  try {
    const ssIdToken = sessionStorage.getItem('idToken');
    if (ssIdToken) {
      const decoded = decodeToken(ssIdToken);
      return {
        token: ssIdToken,
        source: 'sessionStorage.idToken',
        decoded
      };
    }
  } catch (e) {}
  
  return {
    token: null,
    source: 'none',
    decoded: { valid: false, message: 'No token found' }
  };
};

// Create a single unified auth token synchronization function
export const ensureAuthTokens = async () => {
  try {
    // First check if we already have valid tokens
    const currentToken = getCurrentToken();
    
    // If we have a valid, non-expired token, no need to do anything
    if (currentToken.token && currentToken.decoded.valid && !currentToken.decoded.isExpired) {
      return {
        success: true,
        message: 'Token is valid and not expired',
        token: currentToken
      };
    }
    
    // If token is expired but we have a refresh token, try to refresh
    const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        // Import the refresh function from auth services
        const { refreshToken: refreshTokenFn } = await import('../services/authServices');
        const result = await refreshTokenFn();
        
        if (result.success) {
          // Sync the new tokens
          syncAuthTokensAcrossStorage();
          
          return {
            success: true,
            message: 'Token successfully refreshed',
            token: getCurrentToken()
          };
        }
      } catch (refreshError) {
      }
    }
    
    // If we reach here, we couldn't refresh the token or there's no token
    // Try to sync whatever tokens we have
    const syncResult = syncAuthTokensAcrossStorage();
    const newToken = getCurrentToken();
    
    if (newToken.token && newToken.decoded.valid && !newToken.decoded.isExpired) {
      return {
        success: true,
        message: 'Found and synced valid token',
        token: newToken
      };
    }
    
    // If we still don't have a valid token, we need the user to log in again
    return {
      success: false,
      message: 'No valid token found. User needs to log in again.',
      token: null
    };
  } catch (e) {
    return {
      success: false,
      message: 'Error checking or refreshing tokens: ' + (e as Error).message,
      token: null
    };
  }
};

// Debug utilities for authentication flow
// This can help diagnose login and role issues
export const debugAuthState = (): void => {
  // Check localStorage for tokens
  const idToken = localStorage.getItem('idToken');
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  // Check for user data
  const userDataStr = localStorage.getItem('userData') || localStorage.getItem('user');
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
    } catch (e) {
    }
  }
  
  // Check specific role flags
  // Check role functions
  // Check token claims
  if (idToken) {
    try {
      const decoded: any = jwtDecode(idToken);
    } catch (e) {
    }
  }
  
  // Get full user info
  const userInfo = getUserInfo();
};

// Call this function when authentication doesn't work as expected
export const logAuthFailure = (context: string, error?: any): void => {
  debugAuthState();
};

// Call this to check if token claims match localStorage data
export const checkTokenConsistency = (): void => {
  try {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      return;
    }
    
    const decoded: any = jwtDecode(idToken);
    const tokenRole = decoded['custom:role'] || decoded['custom:userRole'] || decoded.role;
    const storedRole = localStorage.getItem('userRole');
    if (tokenRole && (!storedRole || tokenRole.toLowerCase() !== storedRole.toLowerCase())) {
      // Fix the mismatch by updating localStorage
      localStorage.setItem('userRole', tokenRole);
      // Update admin flag if needed
      if (tokenRole.toLowerCase() === 'admin' || tokenRole.toLowerCase() === 'administrator') {
        localStorage.setItem('isAdmin', 'true');
      } else {
        localStorage.removeItem('isAdmin');
      }
    }
  } catch (error) {
  }
};

/**
 * Get current authentication state information
 */
export const getAuthState = () => {
  const authProvider = localStorage.getItem('authProvider');
  const idToken = localStorage.getItem('idToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const user = localStorage.getItem('user');
  
  return {
    authProvider,
    hasIdToken: !!idToken,
    hasRefreshToken: !!refreshToken,
    hasUser: !!user,
    userData: user ? JSON.parse(user) : null,
    isAuthenticated: !!idToken,
    sessionActive: localStorage.getItem('pilotforceSessionActive') === 'true',
    isAdmin: localStorage.getItem('isAdmin') === 'true'
  };
};

/**
 * Log current auth state to console
 */
export const logAuthStateConsole = () => {
  console.group('Auth State');
  console.log(getAuthState());
  console.groupEnd();
};

/**
 * Check if auth provider is set correctly
 */
export const checkAuthProvider = () => {
  const authProvider = localStorage.getItem('authProvider');
  const user = localStorage.getItem('user');
  
  if (!authProvider) {
    console.warn('No auth provider set in localStorage');
    return false;
  }
  
  if (user) {
    const userData = JSON.parse(user);
    console.log(`Auth provider: ${authProvider}, User: ${userData.email || 'unknown'}`);
  }
  
  return true;
};

export default {
  logAuthState,
  syncAuthTokensAcrossStorage,
  decodeToken,
  getCurrentToken,
  ensureAuthTokens,
  debugAuthState,
  logAuthFailure,
  checkTokenConsistency,
  getAuthState,
  logAuthStateConsole,
  checkAuthProvider
};
