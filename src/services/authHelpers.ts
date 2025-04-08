/**
 * Authentication helper utilities
 */

/**
 * Gets the authentication token from storage (localStorage or sessionStorage)
 * @returns The authentication token or null if not found
 */
export const getAuthToken = (): string | null => {
  // Check localStorage first
  const idToken = localStorage.getItem('idToken');
  if (idToken) return idToken;
  
  // Then check sessionStorage
  const sessionToken = sessionStorage.getItem('idToken');
  if (sessionToken) return sessionToken;
  
  // Check other possible token storage formats
  const tokensStr = localStorage.getItem('tokens');
  if (tokensStr) {
    try {
      const tokens = JSON.parse(tokensStr);
      if (tokens.idToken) {
        // Store it in the standard location for future use
        localStorage.setItem('idToken', tokens.idToken);
        return tokens.idToken;
      }
    } catch (e) {
      console.error('Error parsing tokens:', e);
    }
  }
  
  const token = localStorage.getItem('token');
  if (token) return token;
  
  const authHeader = localStorage.getItem('authHeader');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
};

/**
 * Sets the authentication token in storage
 * @param token The token to store
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem('idToken', token);
  sessionStorage.setItem('idToken', token); // Backup in sessionStorage
};

/**
 * Clears all authentication tokens from storage
 */
export const clearAuthTokens = (): void => {
  localStorage.removeItem('idToken');
  sessionStorage.removeItem('idToken');
  localStorage.removeItem('tokens');
  localStorage.removeItem('token');
  localStorage.removeItem('authHeader');
};

/**
 * Gets the user info from storage
 * @returns The user info or null if not found
 */
export const getUserFromStorage = (): any | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (e) {
    console.error('Error parsing user data:', e);
    return null;
  }
};

/**
 * Sets the user info in storage
 * @param user The user info to store
 */
export const setUserInStorage = (user: any): void => {
  localStorage.setItem('user', JSON.stringify(user));
};

/**
 * Clears the user info from storage
 */
export const clearUserFromStorage = (): void => {
  localStorage.removeItem('user');
};
