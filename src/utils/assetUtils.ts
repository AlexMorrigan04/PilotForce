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
    console.error('Error fetching assets:', error);
    throw error;
  }
};

/**
 * Gets the count of assets for a company
 * @param companyId - The ID of the company to count assets for
 * @returns Promise resolving to the number of assets
 */
export const getAssetCount = async (companyId: string): Promise<number> => {
  try {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    // Use the countOnly parameter to only get the count, not all assets
    const response = await fetch(`${apiUrl}/assets?companyId=${companyId}&countOnly=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch asset count: ${response.status}`);
    }
    
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('Error fetching asset count:', error);
    return 0; // Return 0 as fallback in case of error
  }
};

export default {
  getAssets,
  getAssetCount
};