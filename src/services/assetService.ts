import axios from 'axios';
import { refreshToken } from './authServices';

const API_URL = 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

// Track if we're currently trying to refresh the token to prevent infinite loops
let isRefreshingToken = false;

/**
 * Fetches all assets for a company
 * @param companyId The company ID
 * @returns Array of assets
 */
export const getAssets = async (companyId: string): Promise<any[]> => {
  try {
    // Get ID token from localStorage
    const token = localStorage.getItem('idToken');
    
    if (!token) {
      console.error('Authentication token missing, cannot make API request');
      throw new Error('Authentication error: Please log in again');
    }
    
    console.log(`Making API request to: ${API_URL}/assets with token: ${token.substring(0, 15)}...`);
    
    // Use the /assets endpoint to fetch all assets for the company
    const response = await axios.get(`${API_URL}/assets`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        companyId
      },
      timeout: 10000 // Add timeout to prevent hanging requests
    });
    
    console.log('API response status:', response.status);
    
    // Parse response data based on structure
    let assets: any[] = [];
    
    if (response.data && response.data.assets) {
      console.log(`Found ${response.data.assets.length} assets in response`);
      assets = response.data.assets;
    } else if (Array.isArray(response.data)) {
      console.log(`Found ${response.data.length} assets in response (array format)`);
      assets = response.data;
    } else {
      console.warn('Unexpected API response format:', response.data);
    }
    
    return assets;
  } catch (error: any) {
    console.error('Error fetching assets:', error);
    
    // Log detailed error information
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      console.error('Error response headers:', error.response.headers);
      
      // Try to refresh token if we got a 401 and we're not already refreshing
      if (error.response.status === 401 && !isRefreshingToken) {
        console.log('Attempting to refresh token due to 401 error...');
        
        try {
          isRefreshingToken = true;
          const refreshResult = await refreshToken();
          isRefreshingToken = false;
          
          if (refreshResult.success) {
            // Token refreshed successfully, try again with new token
            console.log('Token refreshed successfully, retrying request...');
            return getAssets(companyId);
          } else {
            // If token refresh failed, we need to log in again
            throw new Error('Authentication error: Please log in again');
          }
        } catch (refreshError) {
          isRefreshingToken = false;
          console.error('Error during token refresh:', refreshError);
          throw new Error('Authentication error: Please log in again');
        }
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Error request:', error.request);
      throw new Error('Network error: Unable to connect to the server');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    
    // Handle specific error cases
    if (error.response?.status === 403) {
      throw new Error('Authorization error: You do not have permission to access these assets');
    }
    
    if (error.response?.status === 502 || error.response?.status === 504) {
      throw new Error('API Gateway error: The service is currently unavailable. Please try again later.');
    }
    
    // If we got here, re-throw the error with a user-friendly message
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch assets');
  }
};

/**
 * Fetches a single asset by ID
 * @param assetId The asset ID
 * @returns The asset details
 */
export const getAssetById = async (assetId: string): Promise<any> => {
  try {
    // Get ID token from localStorage
    const token = localStorage.getItem('idToken');
    
    if (!token) {
      throw new Error('Authentication error: Please log in again');
    }
    
    // Use the /assets/{id} endpoint to fetch a specific asset
    const response = await axios.get(`${API_URL}/assets/${assetId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000 // Add timeout to prevent hanging requests
    });
    
    if (response.data && response.data.asset) {
      return response.data.asset;
    } else {
      console.warn('Unexpected API response format for asset details:', response.data);
      return response.data;
    }
  } catch (error: any) {
    // Handle token refresh similar to getAssets
    if (error.response?.status === 401 && !isRefreshingToken) {
      console.log('Attempting to refresh token due to 401 error...');
      
      try {
        isRefreshingToken = true;
        const refreshResult = await refreshToken();
        isRefreshingToken = false;
        
        if (refreshResult.success) {
          // Token refreshed successfully, try again with new token
          console.log('Token refreshed successfully, retrying request...');
          return getAssetById(assetId);
        } else {
          // If token refresh failed, we need to log in again
          throw new Error('Authentication error: Please log in again');
        }
      } catch (refreshError) {
        isRefreshingToken = false;
        console.error('Error during token refresh:', refreshError);
        throw new Error('Authentication error: Please log in again');
      }
    }
    
    if (error.response?.status === 404) {
      throw new Error('Asset not found');
    } else if (error.response?.status === 403) {
      throw new Error('You do not have permission to access this asset');
    }
    
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch asset details');
  }
};

export default {
  getAssets,
  getAssetById
};
