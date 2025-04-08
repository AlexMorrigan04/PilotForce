/**
 * Utility for debugging authentication tokens
 */

/**
 * Check if a JWT token is expired
 * @param token The JWT token to check
 * @returns True if the token is expired, false otherwise
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    // Get payload part of the token
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const { exp } = JSON.parse(jsonPayload);
    const expired = Date.now() >= exp * 1000;
    return expired;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Assume expired if there's an error
  }
};

/**
 * Get token information
 * @param token The JWT token to analyze
 * @returns Object with token information
 */
export const getTokenInfo = (token: string | null): any => {
  if (!token) {
    return { error: 'No token provided' };
  }

  try {
    // Get payload part of the token
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { error: 'Invalid token format' };
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    const now = Date.now() / 1000;
    
    return {
      ...payload,
      isExpired: payload.exp < now,
      expiresIn: payload.exp ? Math.round(payload.exp - now) : null,
      tokenLength: token.length,
    };
  } catch (error) {
    console.error('Error parsing token:', error);
    return { error: 'Invalid token or parsing error' };
  }
};

/**
 * Utility for debugging authentication tokens
 */
export function debugAuthState() {
  console.log("=== TOKEN DEBUGGER ===");
  
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.log("Not in browser environment");
    return;
  }
  
  // Check for token in localStorage
  const token = localStorage.getItem('token');
  const idToken = localStorage.getItem('idToken');
  const userData = localStorage.getItem('user');
  
  console.log("Token available:", !!token);
  console.log("ID Token available:", !!idToken);
  console.log("User data available:", !!userData);
  
  // Try to decode and log token information (without exposing the full token)
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        console.log("Token structure valid (has 3 parts)");
        
        try {
          // Decode the payload (second part)
          const base64Payload = parts[1];
          const normalizedBase64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(normalizedBase64));
          
          // Log important details without exposing everything
          console.log("Token payload preview:", {
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'Not found',
            iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'Not found',
            expired: payload.exp ? Date.now() > payload.exp * 1000 : 'Unknown',
            user_id: payload.sub || 'Not found',
            email: payload.email || 'Not found',
            username: payload.username || payload['cognito:username'] || 'Not found'
          });
        } catch (e) {
          console.error("Failed to decode token payload:", e);
        }
      } else {
        console.error("Token malformed - doesn't have 3 parts separated by dots");
      }
    } catch (e) {
      console.error("Error examining token:", e);
    }
  }
  
  // Add a note about how tokens should be sent to API
  console.log("API expects tokens in format: 'Authorization: Bearer xyz123...'");
  console.log("=====================");
}

/**
 * Fix an authentication token by ensuring it has the proper Bearer prefix
 */
export function ensureTokenFormat(token: string | null): string | null {
  if (!token) return null;
  
  // If token already starts with Bearer, return as is
  if (token.trim().startsWith('Bearer ')) {
    return token;
  }
  
  // Otherwise add the Bearer prefix
  return `Bearer ${token}`;
}

export default {
  isTokenExpired,
  getTokenInfo,
  debugAuthState,
  ensureTokenFormat
};
