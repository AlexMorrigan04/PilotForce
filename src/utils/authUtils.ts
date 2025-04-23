/**
 * Auth utility functions for handling API URLs and authentication tokens
 */

// API base URL - adjust as needed based on your environment configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

/**
 * Returns the base API URL
 * @returns The configured API URL
 */
export const getApiUrl = (): string => {
  return API_BASE_URL;
};

/**
 * Get the authentication token from localStorage with improved error handling
 * @returns The authentication token or null if not found
 */
export const getAuthToken = (): string | null => {
  try {
    // First try to get the idToken directly
    let token = localStorage.getItem('idToken');
    if (token) return token;
    
    // Try alternate storage locations or naming conventions
    token = localStorage.getItem('accessToken');
    if (token) return token;
    
    // Try parsing from stored user object
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.token) return user.token;
      } catch (e) {
      }
    }
    
    // Try auth data storage
    const authStr = localStorage.getItem('authData');
    if (authStr) {
      try {
        const authData = JSON.parse(authStr);
        if (authData && authData.token) return authData.token;
      } catch (e) {
      }
    }
    
    console.warn('No authentication token found in any storage location');
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Saves the authentication token
 * @param token - The token to save
 */
export const saveAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
};

/**
 * Removes the authentication token (logout)
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem('token');
};

/**
 * Checks if the user is authenticated
 * @returns Boolean indicating if the user has a valid token
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export default {
  getApiUrl,
  getAuthToken,
  saveAuthToken,
  removeAuthToken,
  isAuthenticated
};