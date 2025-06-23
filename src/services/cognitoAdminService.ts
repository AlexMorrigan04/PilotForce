import axios from 'axios';
import * as authManager from '../utils/authManager';
import { debugToken } from '../utils/debugTokens';

// Get API endpoint from environment variables
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || '';

// Make sure we're specifically using the Cognito user pool ID
const USER_POOL_ID = process.env.REACT_APP_USER_POOL_ID || '';

// Create an axios instance for admin API calls
const adminApiClient = axios.create({
  baseURL: API_ENDPOINT,
  timeout: 10000,
});

// Add a request interceptor to include the auth token in every request
adminApiClient.interceptors.request.use(
  (config) => {
    const token = authManager.getIdToken() || authManager.getAccessToken();
    
    // Log token info without exposing the actual token
    if (token) {
      // Set the Authorization header with the Bearer token
      config.headers.Authorization = `Bearer ${token}`;
      
      // Also add the Authorization header to params to work around API Gateway issues
      if (!config.params) {
        config.params = {};
      }
      config.params.auth = token;

      // Remove debug headers that are causing CORS issues
      if (config.headers['X-Debug-Token-Info']) {
        delete config.headers['X-Debug-Token-Info'];
      }
    } else {
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Check if the current user has admin status
 */
export const checkAdminStatus = async () => {
  try {
    // Debug token before making the request
    debugToken('pre-admin-check');
    
    // First try with access token
    const accessToken = authManager.getAccessToken();
    const idToken = authManager.getIdToken();
    const response = await adminApiClient.get('/admin', {
      headers: {
        'Authorization': `Bearer ${accessToken || idToken}`
      }
    });
    
    return response.data;
  } catch (error) {
    // If the error is due to an expired token, try to refresh and retry
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      try {
        // Try to refresh the token
        const refreshed = await authManager.refreshTokens();
        if (refreshed) {
          // Retry the request with new tokens
          const newToken = authManager.getIdToken() || authManager.getAccessToken();
          const retryResponse = await adminApiClient.get('/admin', {
            headers: {
              'Authorization': `Bearer ${newToken}`
            }
          });
          return retryResponse.data;
        }
      } catch (refreshError) {
      }
    }
    
    // Return a failed admin check result
    return { isAdmin: false, error: 'Failed to verify admin status' };
  }
};

/**
 * Get all Cognito users
 */
export const getAllUsers = async (filters = {}) => {
  try {
    // Add filter parameters to the request
    const params = { 
      ...filters,
      userPoolId: USER_POOL_ID // Explicitly specify the user pool ID
    };
    
    // First try with both tokens
    const accessToken = authManager.getAccessToken();
    const idToken = authManager.getIdToken();
    
    // Attempt with multiple token types
    const response = await adminApiClient.get('/admin/users', {
      params,
      headers: {
        'Authorization': `Bearer ${accessToken || idToken}`
      }
    });
    
    return response.data;
  } catch (error) {
    // If the error is due to an expired token, try to refresh and retry
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      try {
        // Try to refresh the token
        const refreshed = await authManager.refreshTokens();
        if (refreshed) {
          // Retry the request with new tokens
          const newToken = authManager.getIdToken() || authManager.getAccessToken();
          const retryResponse = await adminApiClient.get('/admin/users', {
            params: {
              ...filters,
              userPoolId: USER_POOL_ID
            },
            headers: {
              'Authorization': `Bearer ${newToken}`
            }
          });
          return retryResponse.data;
        }
      } catch (refreshError) {
      }
    }
    
    // Return a structured error for better handling
    throw new Error('Unauthorized');
  }
};

/**
 * Toggle a user's access (enable/disable)
 */
export const toggleUserAccess = async (userId: string, isEnabled: boolean): Promise<any> => {
  try {
    // Add token info to request
    const accessToken = authManager.getAccessToken();
    const idToken = authManager.getIdToken();
    
    // Create the action based on the desired state
    const action = isEnabled ? 'APPROVE' : 'REJECT';
    
    // Make the API request to toggle user access
    const response = await adminApiClient.put(`/admin/users/${userId}/access`, 
      { action, userPoolId: USER_POOL_ID }, 
      {
        headers: {
          'Authorization': `Bearer ${accessToken || idToken}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    // If token expired, try to refresh and retry
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      try {
        const refreshed = await authManager.refreshTokens();
        if (refreshed) {
          const newToken = authManager.getIdToken() || authManager.getAccessToken();
          const retryResponse = await adminApiClient.put(`/admin/users/${userId}/access`, 
            { action: isEnabled ? 'APPROVE' : 'REJECT', userPoolId: USER_POOL_ID },
            {
              headers: {
                'Authorization': `Bearer ${newToken}`
              }
            }
          );
          return retryResponse.data;
        }
      } catch (refreshError) {
      }
    }
    
    throw new Error('Failed to toggle user access');
  }
};

export default {
  checkAdminStatus,
  getAllUsers,
  toggleUserAccess,
};
