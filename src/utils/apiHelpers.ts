/**
 * API Helper functions for debugging and development
 */

/**
 * Debug function to log API responses in a consistent format
 * @param response - The API response object
 * @param context - Optional context description
 */
export const logApiResponse = (response: any, context: string = 'API Response'): void => {
  // Try to parse Lambda proxy response format
  if (response?.data?.body && typeof response.data.body === 'string') {
    try {
      const parsedBody = JSON.parse(response.data.body);
    } catch (e) {
    }
  }
};

/**
 * Clears company-related data from storage to force fresh fetch
 */
export const clearCompanyCache = (): void => {
  // Remove cached company data
  localStorage.removeItem('companyName');
  localStorage.removeItem('companyData');
  localStorage.removeItem('companyNameCacheTime');
};

/**
 * Diagnoses company API fetch issues
 * @returns Diagnostic information
 */
export const diagnoseCompanyApi = async (): Promise<{ success: boolean, diagnostics: any }> => {
  try {
    // Check for stored tokens
    const idToken = localStorage.getItem('idToken');
    const accessToken = localStorage.getItem('accessToken');
    const tokenExpiry = getTokenExpiry();
    
    // Get company ID
    const companyId = localStorage.getItem('companyId');
    
    // Fetch basic diagnostics
    const diagnostics = {
      companyId,
      hasIdToken: !!idToken,
      hasAccessToken: !!accessToken,
      tokenStatus: tokenExpiry > 0 ? 'valid' : 'expired',
      tokenExpiresIn: tokenExpiry > 0 ? `${Math.floor(tokenExpiry / 60)} minutes` : 'expired',
      cachedCompanyName: localStorage.getItem('companyName'),
      cacheTtl: getCacheTtl(),
    };
    
    return { 
      success: true,
      diagnostics
    };
  } catch (error) {
    return {
      success: false,
      diagnostics: { error: String(error) }
    };
  }
};

/**
 * Gets the TTL of the company name cache in seconds
 * @returns The number of seconds until cache expiry or 0 if expired
 */
export const getCacheTtl = (): number => {
  const cacheTimestamp = localStorage.getItem('companyNameCacheTime');
  if (!cacheTimestamp) return 0;
  
  const cacheAge = Date.now() - parseInt(cacheTimestamp);
  const cacheTtl = 3600000 - cacheAge; // 1 hour cache validity
  
  return cacheTtl > 0 ? Math.floor(cacheTtl / 1000) : 0;
};

/**
 * Calculates token expiry time in seconds
 * @returns Seconds until token expires or -1 if no valid token or already expired
 */
export const getTokenExpiry = (): number => {
  try {
    const token = localStorage.getItem('idToken') || localStorage.getItem('accessToken');
    if (!token) return -1;
    
    // Decode JWT token without library
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return expiryTime > currentTime ? Math.floor((expiryTime - currentTime) / 1000) : -1;
  } catch (e) {
    return -1;
  }
};

/**
 * Gets a suitable authentication token for API requests
 * @returns The best available token or null if none found
 */
export const getBestAuthToken = (): string | null => {
  // Try multiple token storage locations and formats
  const idToken = localStorage.getItem('idToken') || sessionStorage.getItem('idToken');
  const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  const bearerToken = localStorage.getItem('bearerToken') || sessionStorage.getItem('bearerToken');
  
  // Return the first available token
  return idToken || accessToken || bearerToken || null;
};

export default {
  logApiResponse,
  clearCompanyCache,
  getBestAuthToken
};
