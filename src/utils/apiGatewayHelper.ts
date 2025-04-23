/**
 * Helper functions to ensure correct API Gateway integration
 */

// API Gateway base URL - matches what's in your API Gateway configuration
const API_BASE_URL = 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

/**
 * Formats a URL for API Gateway, ensuring path parameters are correctly formatted
 * 
 * @param basePath - The base path of the endpoint (e.g., '/companies')
 * @param pathParam - A path parameter to be included (e.g., a company ID)
 * @param subPath - An optional sub-path after the path parameter (e.g., '/users')
 * @param queryParams - An optional object containing query parameters
 * @returns The formatted URL
 */
export function formatApiUrl(
  basePath: string, 
  pathParam?: string, 
  subPath?: string, 
  queryParams?: Record<string, string>
): string {
  // Start with the base URL and path
  let url = `${API_BASE_URL}${basePath}`;
  
  // Add path parameter if provided
  if (pathParam) {
    url += `/${encodeURIComponent(pathParam)}`;
  }
  
  // Add sub-path if provided
  if (subPath) {
    url += subPath;
  }
  
  // Add query parameters if provided
  if (queryParams && Object.keys(queryParams).length > 0) {
    url += '?';
    url += Object.entries(queryParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }
  
  return url;
}

/**
 * Gets an authentication header value from available credentials
 * 
 * @returns Authentication header value or null if no credentials available
 */
export function getAuthHeaderValue(): string | null {
  // Try token first
  const idToken = localStorage.getItem('idToken');
  if (idToken) {
    return `Bearer ${idToken}`;
  }
  
  // Try tokens object
  const tokensStr = localStorage.getItem('tokens');
  if (tokensStr) {
    try {
      const tokens = JSON.parse(tokensStr);
      if (tokens && tokens.idToken) {
        return `Bearer ${tokens.idToken}`;
      }
    } catch (e) {
    }
  }
  
  // Try basic auth
  const username = localStorage.getItem('auth_username');
  const password = localStorage.getItem('auth_password');
  if (username && password) {
    return `Basic ${btoa(`${username}:${password}`)}`;
  }
  
  return null;
}

/**
 * Creates standard headers for API requests with authentication
 * Ensures compatibility with your API Gateway configuration
 * 
 * @returns Headers object with content type and auth if available
 */
export function createApiHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  const authHeader = getAuthHeaderValue();
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  
  return headers;
}

/**
 * Creates a proper request for API Gateway Lambda proxy integration
 * Matches the integration type in your API Gateway configuration
 */
export async function callApiGateway(
  path: string,
  method: string = 'GET',
  body: any = null,
  additionalHeaders: Record<string, string> = {}
): Promise<any> {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    ...createApiHeaders(),
    ...additionalHeaders
  };
  
  // API Gateway expects POST requests for Lambda integrations
  // but we should still use the correct HTTP method in our client code
  const options: RequestInit = {
    method, // Keep the original method
    headers,
    // Only include body for non-GET requests if it exists
    ...(method !== 'GET' && body && { body: JSON.stringify(body) })
  };
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status}`);
    }
    
    // Parse JSON or return text for non-JSON responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    const textResponse = await response.text();
    
    // Try to parse as JSON even if content-type is wrong
    try {
      return JSON.parse(textResponse);
    } catch {
      return textResponse;
    }
  } catch (error) {
    throw error;
  }
}
