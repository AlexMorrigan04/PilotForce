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
 * Gets the authentication token from localStorage or other storage
 * @returns The current authentication token or null if not logged in
 */
export const getAuthToken = (): string | null => {
  // First try to get the token from localStorage
  const token = localStorage.getItem('token');
  if (token) return token;
  
  // If not found directly, try to parse from user data (different storage format)
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedData = JSON.parse(userData);
      // Check common token fields in user data
      return parsedData.accessToken || 
             (parsedData.tokens && parsedData.tokens.accessToken) || 
             parsedData.token || 
             null;
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }
  
  return null;
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