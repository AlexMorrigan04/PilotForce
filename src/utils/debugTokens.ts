import authManager from './authManager';

/**
 * Debug Token Manager - Helps diagnose token storage and login issues
 * 
 * This utility provides functions to monitor token changes and diagnose authentication issues.
 */

/**
 * Hook into the login process to debug token storage issues
 * Call this function immediately after your authentication success
 */
export const debugLoginTokens = (loginResponse: any): void => {
  if (loginResponse) {
    if (typeof loginResponse === 'object') {
      // Log potential token locations without exposing actual token values
      const findTokensWithoutExposing = (obj: any, path = ''): void => {
        if (!obj || typeof obj !== 'object') return;
        
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (['token', 'idToken', 'accessToken', 'refreshToken', 'jwtToken', 'jwt'].includes(key)) {
              if (obj[key]) {
                try {
                } catch (e) {
                }
              }
            }
            
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              findTokensWithoutExposing(obj[key], currentPath);
            }
          }
        }
      };
      
      findTokensWithoutExposing(loginResponse);
    }
  } else {
  }
  
  // Try to fix tokens from login response
  const fixResult = authManager.fixTokensOnLogin(loginResponse);
  // Check token status after fix attempt
  const tokens = authManager.getAllAuthTokens();
  const bestToken = authManager.getBestAuthToken();
  if (!bestToken) {
    // Try to recover tokens
    const recoveryResult = authManager.attemptTokenRecovery();
    // Check token status after recovery
    const afterRecoveryToken = authManager.getBestAuthToken();
  }
  
  // Analyze user data structure
  const userDataAnalysis = authManager.analyzeUserDataStructure();
  if (userDataAnalysis.hasUserData) {
  }
};

/**
 * Specifically inspect and debug an OAuth response object
 * Call this function immediately after receiving the OAuth callback
 */
export const inspectOAuthResponse = (oauthResponse: any): void => {
  if (!oauthResponse) {
    return;
  }
  // Check for common OAuth response structures
  const commonFields = ['access_token', 'id_token', 'refresh_token', 'token_type', 'expires_in'];
  const foundFields = commonFields.filter(field => field in oauthResponse);
  // Look for success indicators
  const hasSuccessIndicator = 'success' in oauthResponse || 'status' in oauthResponse;
  if (hasSuccessIndicator) {
  }
  
  // Look for token-related properties
  const hasTokens = 'hasTokens' in oauthResponse || 
                   ('tokens' in oauthResponse) || 
                   (oauthResponse.access_token || oauthResponse.id_token);
  // Look for user data
  const hasUserData = 'hasUser' in oauthResponse || 
                     ('user' in oauthResponse) || 
                     ('userData' in oauthResponse);
  // Try to store tokens if present
  if (hasTokens) {
    let storeResult = 'storeTokensFromOAuth method not available';
    try {
      const authManagerAny = authManager as any;
      if (typeof authManagerAny.storeTokensFromOAuth === 'function') {
        storeResult = authManagerAny.storeTokensFromOAuth(oauthResponse);
      } else {
        if (oauthResponse.id_token || oauthResponse.idToken) {
          const idToken = oauthResponse.id_token || oauthResponse.idToken;
          const accessToken = oauthResponse.access_token || oauthResponse.accessToken;
          const refreshToken = oauthResponse.refresh_token || oauthResponse.refreshToken;
          
          authManager.saveAuthTokens(idToken, accessToken, refreshToken);
          storeResult = 'Manually stored tokens using saveAuthTokens';
        }
      }
    } catch (e) {
      storeResult = `Error storing tokens: ${e}`;
    }
    const tokensAfter = authManager.getAllAuthTokens();
  }
};

/**
 * Check for inconsistencies between auth token presence and session state
 */
export const checkTokenConsistency = (): void => {
  const tokens = authManager.getAllAuthTokens();
  const sessionStatus = authManager.getSessionStatus();
  
  const hasSession = sessionStatus.hasActiveSession;
  const hasTokensInStorage = tokens.localStorage.idToken || 
                            tokens.localStorage.accessToken || 
                            tokens.sessionStorage.idToken || 
                            tokens.sessionStorage.accessToken;
  if (hasSession && !hasTokensInStorage) {
    const userData = authManager.analyzeUserDataStructure();
    const recoveryResult = authManager.attemptTokenRecovery();
  } else if (!hasSession && hasTokensInStorage) {
    const bestToken = authManager.getBestAuthToken();
    if (bestToken) {
      const isValid = authManager.isTokenValid(bestToken);
      if (isValid) {
        let restoreResult = 'restoreSession method not available';
        try {
          const authManagerAny = authManager as any;
          if (typeof authManagerAny.restoreSession === 'function') {
            restoreResult = authManagerAny.restoreSession();
          } else {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('pilotforceSessionActive', 'true');
              localStorage.setItem('pilotforceSessionTimestamp', Date.now().toString());
              restoreResult = 'Manually set session flags in localStorage';
            }
          }
        } catch (e) {
          restoreResult = `Error restoring session: ${e}`;
        }
      }
    }
  } else {
  }
};

/**
 * Visualize the structure of a token object without exposing actual values
 */
export const visualizeTokenStructure = (tokenObj: any): void => {
  if (!tokenObj) {
    return;
  }
  
  const visualizeObj = (obj: any, path = '', depth = 0): void => {
    if (depth > 5) return;
    if (!obj || typeof obj !== 'object') return;
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentPath = path ? `${path}.${key}` : key;
        const value = obj[key];
        
        if (value === null) {
        } else if (typeof value === 'object') {
          if (Array.isArray(value)) {
            if (value.length > 0 && typeof value[0] === 'object') {
              visualizeObj(value[0], `${currentPath}[0]`, depth + 1);
            }
          } else {
            visualizeObj(value, currentPath, depth + 1);
          }
        } else if (typeof value === 'string') {
          if (['token', 'idToken', 'accessToken', 'refreshToken', 'jwt'].includes(key)) {
          } else {
          }
        } else {
        }
      }
    }
  };
  visualizeObj(tokenObj);
};

/**
 * Monitor token changes by periodically checking token status
 * Useful for diagnosing token expiration or removal issues
 */
export const startTokenMonitor = (intervalMs: number = 10000): () => void => {
  const initialToken = authManager.getBestAuthToken();
  const intervalId = setInterval(() => {
    const token = authManager.getBestAuthToken();
    const status = authManager.getSessionStatus();
    if (!token && status.hasActiveSession) {
      const recoveryResult = authManager.attemptTokenRecovery();
    }
  }, intervalMs);
  
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * Log complete token diagnostics 
 * Useful for troubleshooting auth issues
 */
export const logTokenDiagnostics = (): void => {
  const tokens = authManager.getAllAuthTokens();
  if (tokens.localStorage.pilotforceSessionTimestamp) {
    const timestamp = parseInt(tokens.localStorage.pilotforceSessionTimestamp);
    if (!isNaN(timestamp)) {
      const sessionTime = new Date(timestamp);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - sessionTime.getTime()) / (1000 * 60));
    }
  }
  
  const status = authManager.getSessionStatus();
  const bestToken = authManager.getBestAuthToken();
  if (bestToken) {
    try {
      const isValid = authManager.isTokenValid(bestToken);
      let expirationInfo = null;
      try {
        const authManagerAny = authManager as any;
        if (typeof authManagerAny.getTokenExpiration === 'function') {
          expirationInfo = authManagerAny.getTokenExpiration(bestToken);
        } else {
          const tokenParts = bestToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.exp) {
              expirationInfo = payload.exp;
            }
          }
        }
      } catch (e) {
      }
      
      if (expirationInfo) {
        const expirationDate = new Date(expirationInfo * 1000);
        const now = new Date();
        const diffMinutes = Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60));
      }
    } catch (e) {
    }
  }
  
  const userData = authManager.analyzeUserDataStructure();
  if (userData.hasUserData) {
  }
  
  if (status.hasActiveSession && !bestToken) {
    const recoveryResult = authManager.attemptTokenRecovery();
    const tokenAfterRecovery = authManager.getBestAuthToken();
    if (!tokenAfterRecovery) {
    }
  }
};

/**
 * Troubleshoot missing tokens with detailed analysis and recovery steps
 */
export const troubleshootMissingTokens = (): void => {
  const tokens = authManager.getAllAuthTokens();
  const status = authManager.getSessionStatus();
  const bestToken = authManager.getBestAuthToken();
  if (!bestToken) {
    if (status.hasActiveSession) {
      const userData = authManager.analyzeUserDataStructure();
      if (userData.hasUserData) {
      }
      const localStorageKeys = Object.keys(localStorage);
      const potentialTokenKeys = localStorageKeys.filter(key => 
        key.toLowerCase().includes('token') || 
        key.toLowerCase().includes('auth') || 
        key.toLowerCase().includes('cognito')
      );
      
      if (potentialTokenKeys.length > 0) {
      } else {
      }
      const recoveryResult = authManager.attemptTokenRecovery();
      if (!authManager.getBestAuthToken()) {
        const otherLocations = [
          'CognitoIdentityServiceProvider',
          'amplify-authenticator-authState',
          'amazon-cognito-advanced-security-data'
        ];
        
        for (const location of otherLocations) {
          if (localStorage.getItem(location)) {
          }
        }
      }
    } else {
    }
  } else {
    try {
      const isValid = authManager.isTokenValid(bestToken);
      if (!isValid) {
      }
      
      let expirationInfo = null;
      try {
        const authManagerAny = authManager as any;
        if (typeof authManagerAny.getTokenExpiration === 'function') {
          expirationInfo = authManagerAny.getTokenExpiration(bestToken);
        } else {
          const tokenParts = bestToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.exp) {
              expirationInfo = payload.exp;
            }
          }
        }
      } catch (e) {
      }
      
      if (expirationInfo) {
        const expirationDate = new Date(expirationInfo * 1000);
        const now = new Date();
        const diffMinutes = Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60));
        if (diffMinutes <= 0) {
          let refreshResult = 'refreshTokens method not available';
          try {
            const authManagerAny = authManager as any;
            if (typeof authManagerAny.refreshTokens === 'function') {
              refreshResult = authManagerAny.refreshTokens();
            } else {
              refreshResult = 'No refresh capability available, user should log in again';
            }
          } catch (e) {
            refreshResult = `Error refreshing tokens: ${e}`;
          }
        }
      }
    } catch (e) {
    }
  }
};

/**
 * Debug token at a specific point in code
 */
export function debugToken(tag: string): void {
  try {
    // Check local storage tokens
    const localStorageKeys = Object.keys(localStorage);
    const tokenKeys = localStorageKeys.filter(key => 
      key.includes('token') || 
      key.includes('Token') || 
      key.includes('cognito') ||
      key.includes('Cognito')
    );
    // Get individual token values (masked for security)
    tokenKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        const masked = value.substring(0, 10) + '...' + value.substring(value.length - 5);
      } else {
      }
    });
  } catch (error) {
  }
}

export default {
  debugLoginTokens,
  startTokenMonitor,
  logTokenDiagnostics,
  inspectOAuthResponse,
  checkTokenConsistency,
  visualizeTokenStructure,
  troubleshootMissingTokens,
  debugToken
};
