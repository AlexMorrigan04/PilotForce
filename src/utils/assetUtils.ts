import { getApiUrl, getAuthToken } from './authUtils';

export interface Asset {
  AssetId: string;
  name: string;
  description?: string;
  location?: string;
  assetType?: string;
  status?: string;
  CreatedAt?: string;
  CompanyId?: string;
  imagePath?: string;
}

/**
 * Fetches assets for a company
 * @param companyId - The ID of the company to fetch assets for
 * @returns Promise resolving to an array of Assets
 */
export const getAssets = async (companyId: string): Promise<Asset[]> => {
  try {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    const response = await fetch(`${apiUrl}/assets?companyId=${companyId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch assets: ${response.status}`);
    }
    
    const data = await response.json();
    return data.assets || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch the total count of assets for a company
 * @param companyId - The company ID to get assets count for
 * @returns Promise<number> - The count of assets
 */
export const getAssetCount = async (companyId: string): Promise<number> => {
  try {
    const apiUrl = getApiUrl();
    // Get token directly from localStorage as a fallback
    const token = getAuthToken() || localStorage.getItem('idToken');
    
    if (!token) {
      console.warn('No authentication token available, trying alternate methods');
      
      // Try fallback to see if we can get assets from localStorage
      try {
        const cachedAssets = localStorage.getItem(`assets_${companyId}`);
        if (cachedAssets) {
          const parsedAssets = JSON.parse(cachedAssets);
          return Array.isArray(parsedAssets) ? parsedAssets.length : 0;
        }
      } catch (e) {
      }
      
      // Return a default value since we can't authenticate
      return 0;
    }

    // First try to get count from API endpoint if available
    const response = await fetch(`${apiUrl}/assets/count?companyId=${companyId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    // If the API supports count endpoint
    if (response.ok) {
      const data = await response.json();
      return data.count || 0;
    }
    
    // Fallback: If count endpoint doesn't exist, fetch all assets and count them
    const assets = await getAssets(companyId);
    return assets.length;
  } catch (error) {
    
    // Try one more fallback - if we have assets in local storage, use that
    try {
      const cachedAssets = localStorage.getItem(`assets_${companyId}`);
      if (cachedAssets) {
        const parsedAssets = JSON.parse(cachedAssets);
        return Array.isArray(parsedAssets) ? parsedAssets.length : 0;
      }
    } catch (e) {
    }
    
    // Return 0 as default if all methods fail
    return 0;
  }
};

export default {
  getAssets,
  getAssetCount
};