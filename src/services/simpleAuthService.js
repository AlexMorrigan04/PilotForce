/**
 * Simple authentication service
 */

/**
 * Get authentication token from localStorage
 * @returns {string|null} The authentication token or null if not found
 */
export const getAuth = () => {
  // Try to get the token from various localStorage locations
  const idToken = localStorage.getItem('idToken');
  if (idToken) return idToken;
  
  const tokensStr = localStorage.getItem('tokens');
  if (tokensStr) {
    try {
      const tokens = JSON.parse(tokensStr);
      if (tokens.idToken) return tokens.idToken;
    } catch (e) {
    }
  }
  
  // Try other token formats
  const token = localStorage.getItem('token');
  if (token) return token;
  
  const authHeader = localStorage.getItem('authHeader');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
};

/**
 * Set authentication token in localStorage
 * @param {string} token - The token to store
 */
export const setAuth = (token) => {
  localStorage.setItem('idToken', token);
};

/**
 * Clear authentication from localStorage
 */
export const clearAuth = () => {
  localStorage.removeItem('idToken');
  localStorage.removeItem('tokens');
  localStorage.removeItem('token');
  localStorage.removeItem('authHeader');
};

/**
 * Register a new user with a company
 * @param {Object} userData - User registration data
 */
export const registerUserWithCompany = async (userData) => {
  // Implementation can be added later
  return { success: false, message: 'Not implemented' };
};

/**
 * Sign up a new user
 * @param {Object} userData - User signup data 
 */
export const signUp = async (userData) => {
  // Implementation can be added later
  return { success: false, message: 'Not implemented' };
};
