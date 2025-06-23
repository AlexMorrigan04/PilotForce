import axios from 'axios';
import { refreshToken } from './authServices';
import { getAuthToken } from '../utils/authUtils';

const API_URL = process.env.REACT_APP_API_ENDPOINT || '';

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
      throw new Error('Authentication error: Please log in again');
    }
    
    
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
    
    
    // Parse response data based on structure
    let assets: any[] = [];
    
    if (response.data && response.data.assets) {
      assets = response.data.assets;
    } else if (Array.isArray(response.data)) {
      assets = response.data;
    } else {
    }
    
    return assets;
  } catch (error: any) {
    
    // Log detailed error information
    if (error.response) {
      
      // Try to refresh token if we got a 401 and we're not already refreshing
      if (error.response.status === 401 && !isRefreshingToken) {
        
        try {
          isRefreshingToken = true;
          const refreshResult = await refreshToken();
          isRefreshingToken = false;
          
          if (refreshResult.success) {
            // Token refreshed successfully, try again with new token
            return getAssets(companyId);
          } else {
            // If token refresh failed, we need to log in again
            throw new Error('Authentication error: Please log in again');
          }
        } catch (refreshError) {
          isRefreshingToken = false;
          throw new Error('Authentication error: Please log in again');
        }
      }
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('Network error: Unable to connect to the server');
    } else {
      // Something happened in setting up the request that triggered an Error
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
 * @returns Promise<any>
 */
export const getAssetById = async (assetId: string): Promise<any> => {
  try {
    // Get ID token instead of access token
    const token = localStorage.getItem('idToken');
    
    if (!token) {
      throw new Error('Authentication error: Please log in again');
    }

    // Get company ID from localStorage
    const companyId = localStorage.getItem('companyId') || 
                     localStorage.getItem('selectedCompanyId') ||
                     JSON.parse(localStorage.getItem('userData') || '{}').companyId;

    if (!companyId) {
      throw new Error('Company ID not found. Please select a company first.');
    }

    const response = await axios.get(`${API_URL}/assets/${assetId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        companyId
      }
    });

    // Transform the response to match the expected format
    const asset = response.data;
    return {
      asset: {
        ...asset,
        Name: asset.name || asset.Name,
        Description: asset.description || asset.Description,
        Address: asset.address || asset.Address,
        Postcode: asset.postcode || asset.Postcode,
        AssetType: asset.type || asset.AssetType || 'buildings',
        Area: asset.area || asset.Area || 0,
        CreatedAt: asset.createdAt || asset.CreatedAt,
        UpdatedAt: asset.updatedAt || asset.UpdatedAt,
        Tags: asset.tags || asset.Tags || [],
        CenterPoint: asset.centerPoint || asset.CenterPoint,
        Coordinates: asset.coordinates || asset.Coordinates,
        GeoJSON: asset.geoJSON || asset.GeoJSON,
        AssetId: asset.id || asset.AssetId || assetId,
        CompanyId: asset.companyId || asset.CompanyId || companyId
      },
      bookings: asset.bookings || []
    };
  } catch (error: any) {
    throw error;
  }
};

export default {
  getAssets,
  getAssetById
};
