import { jwtDecode } from 'jwt-decode';

export { };

/**
 * AuthManager - Enhanced authentication management for the application
 * 
 * This utility provides a unified approach to authentication token management,
 * with better error handling, token refresh handling, and cross-storage support.
 */

// Storage key constants
const STORAGE_KEYS = {
  ID_TOKEN: 'idToken',
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'user',
  COGNITO_DETAILS: 'userCognitoDetails',
  TOKENS: 'tokens',
  IS_ADMIN: 'isAdmin',
  AMPLIFY_AUTH: 'amplify-authenticator-authState',
  // Add PilotForce-specific session markers
  PILOTFORCE_SESSION_ACTIVE: 'pilotforceSessionActive',
  PILOTFORCE_SESSION_TIMESTAMP: 'pilotforceSessionTimestamp'
};

/**
 * Check if a token is valid and not expired
 */
export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Parse the payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp && payload.exp < now;
    
    return !isExpired;
  } catch (e) {
    return false;
  }
};

/**
 * Get all available auth tokens from all storage locations
 */
export const getAllAuthTokens = (): { [key: string]: any } => {
  const tokens: { [key: string]: any } = {
    localStorage: {},
    sessionStorage: {}
  };
  
  // Check localStorage
  try {
    tokens.localStorage = {
      idToken: localStorage.getItem(STORAGE_KEYS.ID_TOKEN),
      accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
      refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
      authToken: localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
      // Include session markers
      isAdmin: localStorage.getItem(STORAGE_KEYS.IS_ADMIN),
      pilotforceSessionActive: localStorage.getItem(STORAGE_KEYS.PILOTFORCE_SESSION_ACTIVE),
      pilotforceSessionTimestamp: localStorage.getItem(STORAGE_KEYS.PILOTFORCE_SESSION_TIMESTAMP)
    };
    
    // Try to parse tokens object
    try {
      const tokensStr = localStorage.getItem(STORAGE_KEYS.TOKENS);
      if (tokensStr) {
        tokens.localStorage.tokensObject = JSON.parse(tokensStr);
      }
    } catch (e) {
    }
    
    // Try to parse Cognito details
    try {
      const cognitoStr = localStorage.getItem(STORAGE_KEYS.COGNITO_DETAILS);
      if (cognitoStr) {
        tokens.localStorage.cognitoDetails = JSON.parse(cognitoStr);
      }
    } catch (e) {
    }
    
    // Try to parse Amplify auth
    try {
      const amplifyStr = localStorage.getItem(STORAGE_KEYS.AMPLIFY_AUTH);
      if (amplifyStr) {
        tokens.localStorage.amplifyAuth = JSON.parse(amplifyStr);
      }
    } catch (e) {
    }
  } catch (e) {
  }
  
  // Check sessionStorage
  try {
    tokens.sessionStorage = {
      idToken: sessionStorage.getItem(STORAGE_KEYS.ID_TOKEN),
      accessToken: sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
      refreshToken: sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
      authToken: sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    };
    
    // Try to parse tokens object
    try {
      const tokensStr = sessionStorage.getItem(STORAGE_KEYS.TOKENS);
      if (tokensStr) {
        tokens.sessionStorage.tokensObject = JSON.parse(tokensStr);
      }
    } catch (e) {
    }
  } catch (e) {
  }
  
  return tokens;
};

/**
 * Get the best available token across all storage locations
 */
export const getBestAuthToken = (): string | null => {
  const tokens = getAllAuthTokens();
  
  // Check localStorage tokens first
  if (tokens.localStorage.idToken && isTokenValid(tokens.localStorage.idToken)) {
    return tokens.localStorage.idToken;
  }
  
  if (tokens.localStorage.accessToken && isTokenValid(tokens.localStorage.accessToken)) {
    return tokens.localStorage.accessToken;
  }
  
  if (tokens.localStorage.authToken && isTokenValid(tokens.localStorage.authToken)) {
    return tokens.localStorage.authToken;
  }
  
  // Check tokens object in localStorage
  if (tokens.localStorage.tokensObject?.idToken && isTokenValid(tokens.localStorage.tokensObject.idToken)) {
    return tokens.localStorage.tokensObject.idToken;
  }
  
  // Check cognito details in localStorage
  if (tokens.localStorage.cognitoDetails?.idToken && isTokenValid(tokens.localStorage.cognitoDetails.idToken)) {
    return tokens.localStorage.cognitoDetails.idToken;
  }
  
  if (tokens.localStorage.cognitoDetails?.fullToken?.token && isTokenValid(tokens.localStorage.cognitoDetails.fullToken.token)) {
    return tokens.localStorage.cognitoDetails.fullToken.token;
  }
  
  // Check Amplify auth in localStorage
  if (tokens.localStorage.amplifyAuth?.tokens?.idToken?.jwtToken && 
      isTokenValid(tokens.localStorage.amplifyAuth.tokens.idToken.jwtToken)) {
    return tokens.localStorage.amplifyAuth.tokens.idToken.jwtToken;
  }
  
  // Check sessionStorage tokens
  if (tokens.sessionStorage.idToken && isTokenValid(tokens.sessionStorage.idToken)) {
    return tokens.sessionStorage.idToken;
  }
  
  if (tokens.sessionStorage.accessToken && isTokenValid(tokens.sessionStorage.accessToken)) {
    return tokens.sessionStorage.accessToken;
  }
  
  if (tokens.sessionStorage.authToken && isTokenValid(tokens.sessionStorage.authToken)) {
    return tokens.sessionStorage.authToken;
  }
  
  // Check tokens object in sessionStorage
  if (tokens.sessionStorage.tokensObject?.idToken && isTokenValid(tokens.sessionStorage.tokensObject.idToken)) {
    return tokens.sessionStorage.tokensObject.idToken;
  }
  
  // Check user data as a last resort
  try {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (userData) {
      const parsedUserData = JSON.parse(userData);
      // Check for token in user data
      if (parsedUserData.idToken && isTokenValid(parsedUserData.idToken)) {
        // Save it to the proper locations for next time
        saveAuthTokens(parsedUserData.idToken, null, null);
        return parsedUserData.idToken;
      }
      
      if (parsedUserData.token && isTokenValid(parsedUserData.token)) {
        saveAuthTokens(parsedUserData.token, null, null);
        return parsedUserData.token;
      }
    }
  } catch (e) {
  }
  
  // If we get here, we don't have any valid tokens
  return null;
};

/**
 * Check for inconsistent auth state and attempt recovery
 * Returns true if recovery was attempted, false otherwise
 */
export const attemptTokenRecovery = (): { attempted: boolean; success: boolean; message: string } => {
  const result = {
    attempted: false,
    success: false,
    message: 'No recovery needed'
  };
  
  // Get current token and session status
  const token = getBestAuthToken();
  const session = hasActiveSession();
  
  // If we have active session markers but no valid tokens, we have an inconsistent state
  if ((session.active || session.isAdmin) && !token) {
    result.attempted = true;
    result.message = 'Detected active session without valid tokens';
    
    try {
      // Check if we have user data in localStorage that might contain a token
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          // Check multiple possible token locations
          const possibleTokens = [
            parsedUserData.idToken,
            parsedUserData.token,
            parsedUserData.accessToken,
            parsedUserData.jwtToken,
            parsedUserData.jwt,
            parsedUserData.auth?.idToken,
            parsedUserData.auth?.token,
            parsedUserData.auth?.accessToken,
            parsedUserData.authData?.idToken,
            parsedUserData.authData?.token,
            parsedUserData.authentication?.idToken,
            parsedUserData.authentication?.token,
            parsedUserData.tokens?.idToken,
            parsedUserData.tokens?.accessToken
          ].filter(Boolean);
          // Try each token
          for (const recoveredToken of possibleTokens) {
            if (isTokenValid(recoveredToken)) {
              // Save the recovered token
              saveAuthTokens(recoveredToken, null, null);
              result.success = true;
              result.message = 'Successfully recovered token from user data';
              return result;
            }
          }
          
          // Check if userData has a nested structure with tokens
          if (parsedUserData.cognito) {
            const cognitoTokens = [
              parsedUserData.cognito.idToken,
              parsedUserData.cognito.accessToken,
              parsedUserData.cognito.jwtToken
            ].filter(Boolean);
            
            for (const cognitoToken of cognitoTokens) {
              if (isTokenValid(cognitoToken)) {
                saveAuthTokens(cognitoToken, null, null);
                result.success = true;
                result.message = 'Successfully recovered token from Cognito data in user profile';
                return result;
              }
            }
          }
          
          // No valid tokens found
        } catch (e) {
        }
      }
      
      // Try to get tokens from other sources
      try {
        const amplifyAuthStr = localStorage.getItem('amplify-authenticator-authState');
        if (amplifyAuthStr) {
          const amplifyAuth = JSON.parse(amplifyAuthStr);
          
          if (amplifyAuth?.tokens?.idToken?.jwtToken) {
            const amplifyToken = amplifyAuth.tokens.idToken.jwtToken;
            if (isTokenValid(amplifyToken)) {
              saveAuthTokens(amplifyToken, null, null);
              result.success = true;
              result.message = 'Successfully recovered token from Amplify auth state';
              return result;
            }
          }
        }
      } catch (e) {
      }
      
      // If we got here, we couldn't recover tokens
      result.message = 'Session is active but tokens are missing and recovery failed';
    } catch (e) {
      result.message = `Error during token recovery: ${e}`;
    }
  }
  
  return result;
};

/**
 * Save tokens across all storage mechanisms
 */
export const saveAuthTokens = (idToken: string | null, accessToken: string | null, refreshToken: string | null) => {
  // LocalStorage
  try {
    if (idToken) localStorage.setItem(STORAGE_KEYS.ID_TOKEN, idToken);
    if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    
    // Save as tokens object
    if (idToken || accessToken || refreshToken) {
      const tokensObj = {
        idToken: idToken || localStorage.getItem(STORAGE_KEYS.ID_TOKEN),
        accessToken: accessToken || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        refreshToken: refreshToken || localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      };
      
      localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokensObj));
      
      // Update PilotForce session markers whenever tokens are set
      localStorage.setItem(STORAGE_KEYS.PILOTFORCE_SESSION_ACTIVE, 'true');
      localStorage.setItem(STORAGE_KEYS.PILOTFORCE_SESSION_TIMESTAMP, Date.now().toString());
      
      // Update user data with tokens to maintain consistency
      try {
        const userDataStr = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          let updated = false;
          
          if (idToken) {
            userData.idToken = idToken;
            userData.token = idToken; // Add redundant token for wider compatibility
            updated = true;
          }
          
          if (accessToken) {
            userData.accessToken = accessToken;
            updated = true;
          }
          
          if (refreshToken) {
            userData.refreshToken = refreshToken;
            updated = true;
          }
          
          if (updated) {
            localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          }
        }
      } catch (e) {
      }
    }
    
    // Update Cognito details if id token changes
    if (idToken) {
      try {
        const cognitoStr = localStorage.getItem(STORAGE_KEYS.COGNITO_DETAILS);
        if (cognitoStr) {
          const cognitoDetails = JSON.parse(cognitoStr);
          cognitoDetails.idToken = idToken;
          if (cognitoDetails.fullToken) {
            cognitoDetails.fullToken.token = idToken;
          }
          localStorage.setItem(STORAGE_KEYS.COGNITO_DETAILS, JSON.stringify(cognitoDetails));
        } else {
          // Create basic Cognito details
          try {
            const decoded: any = jwtDecode(idToken);
            const userDetails = {
              email: decoded.email || 'No email found',
              name: decoded.name || decoded['cognito:username'] || 'No name found',
              groups: decoded['cognito:groups'] || [],
              role: decoded.role || decoded['custom:role'] || decoded['custom:userRole'] || 'No role found',
              sub: decoded.sub || 'No user ID found',
              isAdmin: false,
              idToken: idToken,
              fullToken: { token: idToken, decoded }
            };
            
            // Check admin status - only for specific administrator roles
            userDetails.isAdmin = userDetails.groups.includes('Administrators') ||
              userDetails.groups.includes('Administrator') ||
              (userDetails.role && 
               (userDetails.role.toLowerCase() === 'administrator' || 
                userDetails.role.toLowerCase() === 'admin'));
              
            localStorage.setItem(STORAGE_KEYS.COGNITO_DETAILS, JSON.stringify(userDetails));
            
            // Also set isAdmin flag
            if (userDetails.isAdmin) {
              localStorage.setItem(STORAGE_KEYS.IS_ADMIN, 'true');
            }
            
            // Handle CompanyAdmin role
            if (userDetails.role && userDetails.role.toLowerCase() === 'companyadmin') {
              localStorage.setItem('isCompanyAdmin', 'true');
              localStorage.setItem('approvalStatus', 'APPROVED');
              localStorage.setItem('userAccess', 'true');
            }
          } catch (e) {
          }
        }
      } catch (e) {
      }
    }
  } catch (e) {
  }
  
  // SessionStorage
  try {
    if (idToken) sessionStorage.setItem(STORAGE_KEYS.ID_TOKEN, idToken);
    if (accessToken) sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    
    // Save as tokens object
    if (idToken || accessToken || refreshToken) {
      const tokensObj = {
        idToken: idToken || sessionStorage.getItem(STORAGE_KEYS.ID_TOKEN),
        accessToken: accessToken || sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        refreshToken: refreshToken || sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      };
      
      sessionStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokensObj));
    }
  } catch (e) {
  }
};

/**
 * Clear all auth tokens from all storage
 */
export const clearAllAuthTokens = () => {
  // Clear localStorage
  try {
    localStorage.removeItem(STORAGE_KEYS.ID_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKENS);
    localStorage.removeItem(STORAGE_KEYS.COGNITO_DETAILS);
    localStorage.removeItem(STORAGE_KEYS.IS_ADMIN);
    localStorage.removeItem(STORAGE_KEYS.AMPLIFY_AUTH);
    // Clear PilotForce session markers
    localStorage.removeItem(STORAGE_KEYS.PILOTFORCE_SESSION_ACTIVE);
    localStorage.removeItem(STORAGE_KEYS.PILOTFORCE_SESSION_TIMESTAMP);
  } catch (e) {
  }
  
  // Clear sessionStorage
  try {
    sessionStorage.removeItem(STORAGE_KEYS.ID_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.TOKENS);
    sessionStorage.removeItem(STORAGE_KEYS.COGNITO_DETAILS);
    sessionStorage.removeItem(STORAGE_KEYS.AMPLIFY_AUTH);
  } catch (e) {
  }
};

/**
 * Check if there's an active PilotForce session based on session markers
 * This helps detect situations where session markers exist but tokens are missing
 */
export const hasActiveSession = (): { active: boolean; timestamp: number | null; isAdmin: boolean } => {
  const result = {
    active: false,
    timestamp: null as number | null,
    isAdmin: false
  };

  try {
    // Check for PilotForce session markers
    const sessionActive = localStorage.getItem(STORAGE_KEYS.PILOTFORCE_SESSION_ACTIVE);
    const sessionTimestamp = localStorage.getItem(STORAGE_KEYS.PILOTFORCE_SESSION_TIMESTAMP);
    const isAdmin = localStorage.getItem(STORAGE_KEYS.IS_ADMIN);

    if (sessionActive === 'true') {
      result.active = true;
      result.timestamp = sessionTimestamp ? parseInt(sessionTimestamp, 10) : null;
    }

    if (isAdmin === 'true') {
      result.isAdmin = true;
    }
  } catch (e) {
  }

  return result;
};

/**
 * Get session status information for debugging
 */
export const getSessionStatus = (): { 
  hasTokens: boolean; 
  hasActiveSession: boolean;
  sessionTimestamp: number | null;
  isAdmin: boolean;
  tokenSource: string | null;
} => {
  const token = getBestAuthToken();
  const session = hasActiveSession();
  
  return {
    hasTokens: !!token,
    hasActiveSession: session.active,
    sessionTimestamp: session.timestamp,
    isAdmin: session.isAdmin,
    tokenSource: token ? 'Valid authentication token found' : null
  };
};

/**
 * Diagnostic function to analyze user data structure and log potential token locations
 * This is helpful to understand different formats of auth data storage
 */
export const analyzeUserDataStructure = (): { hasUserData: boolean; structure: any } => {
  const result = {
    hasUserData: false,
    structure: null as any
  };
  
  try {
    // Check user data in localStorage
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (userData) {
      result.hasUserData = true;
      try {
        const parsedData = JSON.parse(userData);
        
        // Create a sanitized structure representation (no actual token values)
        const sanitizeObject = (obj: any, depth = 0): any => {
          if (depth > 3) return '...'; // Prevent infinite recursion
          if (!obj || typeof obj !== 'object') return typeof obj;
          
          const result: any = Array.isArray(obj) ? [] : {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              // Don't include actual token values
              if (['token', 'idToken', 'accessToken', 'refreshToken', 'jwtToken'].includes(key)) {
                result[key] = obj[key] ? '[TOKEN PRESENT]' : null;
              } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                result[key] = sanitizeObject(obj[key], depth + 1);
              } else {
                result[key] = typeof obj[key];
              }
            }
          }
          return result;
        };
        
        result.structure = sanitizeObject(parsedData);
        
        // Log potential token locations for debugging
        const findTokens = (obj: any, path = ''): void => {
          if (!obj || typeof obj !== 'object') return;
          
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              const currentPath = path ? `${path}.${key}` : key;
              
              if (['token', 'idToken', 'accessToken', 'refreshToken', 'jwtToken', 'jwt'].includes(key)) {
                if (obj[key]) {
                }
              }
              
              if (typeof obj[key] === 'object' && obj[key] !== null) {
                findTokens(obj[key], currentPath);
              }
            }
          }
        };
        
        findTokens(parsedData);
      } catch (e) {
        result.structure = 'Error: Failed to parse user data';
      }
    }
    
    // Check for other auth-related data
    ['amplify-authenticator-authState', STORAGE_KEYS.COGNITO_DETAILS, STORAGE_KEYS.TOKENS].forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
        } catch (e) {
        }
      }
    });
  } catch (e) {
  }
  
  return result;
};

/**
 * Fix tokens during login - to be called by your authentication flow
 * This ensures tokens are properly stored across all storage mechanisms
 */
export const fixTokensOnLogin = (loginData: any): { fixed: boolean; message: string } => {
  const result = {
    fixed: false,
    message: 'No action taken'
  };
  if (!loginData) {
    result.message = 'No login data provided';
    return result;
  }
  
  try {
    // Log the structure of the login data
    // Common patterns for tokens in various authentication libraries
    const tokenCandidates = [
      // Direct token properties
      loginData.idToken,
      loginData.token,
      loginData.id_token,
      loginData.accessToken,
      loginData.access_token,
      loginData.jwtToken,
      
      // Nested in auth or tokens objects
      loginData.auth?.idToken,
      loginData.auth?.token,
      loginData.tokens?.idToken,
      loginData.tokens?.accessToken,
      loginData.authenticationResult?.IdToken,
      loginData.authenticationResult?.AccessToken,
      
      // Amplify auth format
      loginData.signInUserSession?.idToken?.jwtToken,
      loginData.signInUserSession?.accessToken?.jwtToken
    ].filter(Boolean);
    // Find a valid token
    let validToken = null;
    for (const token of tokenCandidates) {
      if (isTokenValid(token)) {
        validToken = token;
        break;
      }
    }
    
    // If we found a valid token, save it
    if (validToken) {
      // Extract refresh token if available
      const refreshTokenCandidates = [
        loginData.refreshToken,
        loginData.refresh_token,
        loginData.auth?.refreshToken,
        loginData.tokens?.refreshToken,
        loginData.authenticationResult?.RefreshToken,
        loginData.signInUserSession?.refreshToken?.token
      ].filter(Boolean);
      
      const refreshToken = refreshTokenCandidates.length > 0 ? refreshTokenCandidates[0] : null;
      
      // Save tokens
      saveAuthTokens(validToken, validToken, refreshToken);
      
      // Also ensure user data is saved with tokens
      try {
        if (loginData.user || loginData.attributes) {
          const userData = loginData.user || loginData.attributes || {};
          
          // Make sure token is in the user data
          userData.idToken = validToken;
          userData.token = validToken;
          
          // Save user data
          localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        }
      } catch (e) {
      }
      
      result.fixed = true;
      result.message = 'Successfully fixed tokens from login data';
    } else {
      result.message = 'No valid token found in login data';
    }
  } catch (e) {
    result.message = `Error fixing tokens: ${e}`;
  }
  
  return result;
};

/**
 * Store tokens from OAuth response
 * Properly extracts and stores tokens from different OAuth response formats
 */
const storeTokensFromOAuth = (oauthResponse: any): boolean => {
  if (!oauthResponse) {
    return false;
  }
  
  try {
    // If we already have valid tokens, don't override
    const hasStoredTokens = !!localStorage.getItem('idToken');
    if (hasStoredTokens) {
      return true;
    }
    
    // Case 1: Response contains token fields directly
    if (oauthResponse.id_token || oauthResponse.idToken) {
      const idToken = oauthResponse.id_token || oauthResponse.idToken;
      const accessToken = oauthResponse.access_token || oauthResponse.accessToken;
      const refreshToken = oauthResponse.refresh_token || oauthResponse.refreshToken;
      
      saveAuthTokens(idToken, accessToken, refreshToken);
      return true;
    }
    
    // Case 2: Response contains tokens object
    if (oauthResponse.tokens) {
      const { id_token, idToken, access_token, accessToken, refresh_token, refreshToken } = oauthResponse.tokens;
      saveAuthTokens(
        idToken || id_token,
        accessToken || access_token,
        refreshToken || refresh_token
      );
      return true;
    }
    
    // Case 3: Response from our Lambda includes tokens
    if (oauthResponse.success && oauthResponse.tokens) {
      const { id_token, access_token, refresh_token } = oauthResponse.tokens;
      saveAuthTokens(id_token, access_token, refresh_token);
      
      // Set approval status and access rights for CompanyAdmin users
      if (oauthResponse.user && oauthResponse.user.role && 
          oauthResponse.user.role.toLowerCase() === 'companyadmin') {
        localStorage.setItem('approvalStatus', 'APPROVED');
        localStorage.setItem('userAccess', 'true');
      }
      
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Get the ID token
 */
export const getIdToken = (): string | null => {
  // Try to get token from various storage locations
  const idToken = localStorage.getItem('idToken') || 
                  localStorage.getItem('cognito:idToken') || 
                  localStorage.getItem('CognitoIdentityServiceProvider.idToken');
  
  if (idToken) {
    return idToken;
  }
  
  // Fall back to the best available token
  return getBestAuthToken();
};

/**
 * Get the access token
 */
export const getAccessToken = (): string | null => {
  // Try to get token from various storage locations
  const accessToken = localStorage.getItem('accessToken') || 
                      localStorage.getItem('cognito:accessToken') || 
                      localStorage.getItem('CognitoIdentityServiceProvider.accessToken');
  
  if (accessToken) {
    return accessToken;
  }
  
  // Fall back to any token
  return localStorage.getItem('authToken') || null;
};

/**
 * Refresh the tokens
 */
export const refreshTokens = async (): Promise<boolean> => {
  try {
    // Get the refresh token
    const refreshToken = localStorage.getItem('refreshToken') || 
                         localStorage.getItem('cognito:refreshToken');
    
    if (!refreshToken) {
      return false;
    }
    
    // Attempt to recover tokens
    const recovered = await attemptTokenRecovery();
    if (recovered) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const authManager = {
  isTokenValid,
  getAllAuthTokens,
  getBestAuthToken,
  saveAuthTokens,
  clearAllAuthTokens,
  hasActiveSession,
  getSessionStatus,
  attemptTokenRecovery,
  analyzeUserDataStructure,
  fixTokensOnLogin,
  storeTokensFromOAuth,
  getIdToken,
  getAccessToken,
  refreshTokens,
  STORAGE_KEYS
};

export default authManager;
