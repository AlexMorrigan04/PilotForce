/**
 * Token debugging utilities
 * This module provides functions to debug authentication issues by inspecting tokens.
 */

/**
 * Extract and decode information from a JWT token 
 * @param token JWT token string
 * @returns Decoded token information
 */
export const getTokenInfo = (token: string | null): {
  isValid: boolean;
  header?: any;
  payload?: any;
  expiresAt?: Date;
  issuer?: string;
  subject?: string;
  isExpired: boolean;
  timeToExpiry?: number;
} => {
  if (!token) {
    return {
      isValid: false,
      isExpired: true
    };
  }

  try {
    // Split the token
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        isValid: false,
        isExpired: true
      };
    }

    // Decode the header and payload
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));

    // Check if token is expired
    const expiresAt = new Date(payload.exp * 1000);
    const now = new Date();
    const isExpired = expiresAt < now;
    const timeToExpiry = expiresAt.getTime() - now.getTime(); // milliseconds

    return {
      isValid: true,
      header,
      payload,
      expiresAt,
      issuer: payload.iss,
      subject: payload.sub,
      isExpired,
      timeToExpiry
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return {
      isValid: false,
      isExpired: true
    };
  }
};

/**
 * Check if a JWT token is expired
 * @param token JWT token string
 * @returns True if token is expired or invalid, false otherwise
 */
export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  const tokenInfo = getTokenInfo(token);
  return tokenInfo.isExpired;
};

/**
 * Check if a token should be refreshed (close to expiring)
 * @param token JWT token string
 * @param refreshThresholdMinutes Minutes before expiry to trigger refresh
 * @returns True if token should be refreshed, false otherwise
 */
export const shouldRefreshToken = (
  token: string | null, 
  refreshThresholdMinutes: number = 10
): boolean => {
  if (!token) return true;

  const tokenInfo = getTokenInfo(token);
  
  if (!tokenInfo.isValid || tokenInfo.isExpired) {
    return true;
  }
  
  // If token expires within the threshold, refresh it
  if (tokenInfo.timeToExpiry && tokenInfo.timeToExpiry < refreshThresholdMinutes * 60 * 1000) {
    return true;
  }
  
  return false;
};

/**
 * Print detailed authentication state information to console for debugging
 */
export const debugAuthState = (): void => {
  // Try to get the token from localStorage or sessionStorage
  const token = localStorage.getItem('idToken') || sessionStorage.getItem('idToken');
  const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  
  console.log('====== AUTH STATE DEBUG ======');
  
  // Check token existence
  console.log('Token exists:', !!token);
  console.log('Refresh token exists:', !!refreshToken);
  
  // If token exists, analyze it
  if (token) {
    const tokenInfo = getTokenInfo(token);
    console.log('Token valid:', tokenInfo.isValid);
    
    if (tokenInfo.isValid) {
      console.log('Token expired:', tokenInfo.isExpired);
      console.log('Token issuer:', tokenInfo.issuer);
      console.log('Token subject:', tokenInfo.subject);
      
      if (tokenInfo.expiresAt) {
        console.log('Token expires at:', tokenInfo.expiresAt.toISOString());
        
        if (!tokenInfo.isExpired) {
          const minutesToExpiry = Math.round(tokenInfo.timeToExpiry! / (60 * 1000));
          console.log('Minutes until token expires:', minutesToExpiry);
        }
      }
    }
  }
  
  // Check for other auth indicators in storage
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  console.log('User data exists:', !!userStr);
  
  console.log('====== END AUTH DEBUG ======');
};

/**
 * Generate a diagnostic report of the authentication state
 * @returns Diagnostic report as string
 */
export const generateAuthDiagnostics = (): string => {
  let report = '=== Authentication Diagnostics ===\n\n';
  
  // Get token information
  const token = localStorage.getItem('idToken') || sessionStorage.getItem('idToken');
  report += `ID Token present: ${!!token}\n`;
  
  if (token) {
    const tokenInfo = getTokenInfo(token);
    report += `Token valid: ${tokenInfo.isValid}\n`;
    report += `Token expired: ${tokenInfo.isExpired}\n`;
    
    if (tokenInfo.expiresAt) {
      report += `Token expiry: ${tokenInfo.expiresAt.toISOString()}\n`;
      
      if (!tokenInfo.isExpired) {
        const minutesToExpiry = Math.round(tokenInfo.timeToExpiry! / (60 * 1000));
        report += `Minutes until expiry: ${minutesToExpiry}\n`;
      }
    }
  }
  
  // Check storage state
  report += '\n=== Storage State ===\n';
  report += `localStorage items: ${Object.keys(localStorage).length}\n`;
  
  try {
    report += `sessionStorage items: ${Object.keys(sessionStorage).length}\n`;
  } catch (e) {
    report += 'sessionStorage not accessible\n';
  }
  
  // List relevant auth items
  const authItems = ['idToken', 'accessToken', 'refreshToken', 'user', 
    'tokens', 'auth_username', 'pilotforce_session_timestamp'];
    
  report += '\n=== Auth Items ===\n';
  authItems.forEach(item => {
    const inLocal = !!localStorage.getItem(item);
    let inSession = false;
    
    try {
      inSession = !!sessionStorage.getItem(item);
    } catch (e) {}
    
    report += `${item}: localStorage=${inLocal}, sessionStorage=${inSession}\n`;
  });
  
  return report;
};

export default {
  getTokenInfo,
  isTokenExpired,
  shouldRefreshToken,
  debugAuthState,
  generateAuthDiagnostics,
};
