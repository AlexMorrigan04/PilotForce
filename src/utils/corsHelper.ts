/**
 * Helper functions to deal with CORS issues
 */

/**
 * Check if the current environment is experiencing CORS issues with a specific endpoint
 * @param endpoint API endpoint to check
 * @returns Promise that resolves to true if CORS is working, false otherwise
 */
export const testCorsEndpoint = async (endpoint: string): Promise<boolean> => {
  try {
    const response = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Add CORS headers to a request
 * @param headers Current headers object
 * @returns Headers object with CORS headers added
 */
export const addCorsHeaders = (headers: Record<string, string>): Record<string, string> => {
  return {
    ...headers,
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache' 
  };
};

/**
 * Create a proxy URL for API calls if needed (for development environments)
 * @param url Original API URL
 * @returns Possibly modified URL that works around CORS
 */
export const getProxyUrl = (url: string): string => {
  // In production, we use the original URL
  if (process.env.NODE_ENV === 'production') {
    return url;
  }
  
  // For development, you might use a proxy defined in package.json
  if (url.startsWith('https://') && process.env.REACT_APP_USE_PROXY === 'true') {
    // If the URL is absolute, convert it to a relative URL that will use the proxy
    const apiUrl = process.env.REACT_APP_API_URL || '';
    return url.replace(apiUrl, '/api');
  }
  
  return url;
};
