/**
 * Secure Fetch Utility
 * Provides CSRF-protected and authenticated fetch functionality
 */

import { getCsrfToken } from './csrfProtection';
import { getAuthTokens } from './secureStorage';
import config from './environmentConfig';
import secureLogger from './secureLogger';

/**
 * Interface for secure fetch options
 */
interface SecureFetchOptions extends RequestInit {
  // Add URL parameters to be appended to the URL
  params?: Record<string, string | number | boolean | undefined | null>;
  
  // Whether to include auth token in request
  includeAuth?: boolean;
  
  // Whether to include CSRF token in request
  includeCsrf?: boolean;
  
  // Custom error handling
  onError?: (error: any) => void;
}

/**
 * Default secure fetch options
 */
const defaultOptions: SecureFetchOptions = {
  includeAuth: true,
  includeCsrf: true,
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * Make a secure fetch request with CSRF protection and auth tokens
 * @param url Request URL
 * @param options Fetch options
 * @returns Promise with response
 */
export async function secureFetch<T = any>(
  url: string,
  options: SecureFetchOptions = {}
): Promise<T> {
  try {
    const mergedOptions: SecureFetchOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    // Add authentication token if required
    if (mergedOptions.includeAuth !== false) {
      const tokens = getAuthTokens();
      if (tokens.idToken) {
        (mergedOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${tokens.idToken}`;
      }
    }
    
    // Add CSRF token for non-GET requests if required
    if (
      mergedOptions.includeCsrf !== false &&
      config.FEATURES.USE_CSRF &&
      mergedOptions.method !== 'GET' &&
      mergedOptions.method !== 'HEAD'
    ) {
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        (mergedOptions.headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
      }
    }
    
    // Add URL parameters if provided
    let fullUrl = url;
    if (mergedOptions.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(mergedOptions.params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    
    // Remove custom options before passing to fetch
    const { params, includeAuth, includeCsrf, onError, ...fetchOptions } = mergedOptions;
    
    // Make the fetch request
    const response = await fetch(fullUrl, fetchOptions);
    
    // Handle HTTP error status codes
    if (!response.ok) {
      let errorData;
      try {
        // Try to parse error response as JSON
        errorData = await response.json();
      } catch (e) {
        // If not JSON, use status text
        errorData = { message: response.statusText };
      }
      
      const error = new Error(
        errorData.message || `HTTP error ${response.status}`
      );
      (error as any).status = response.status;
      (error as any).data = errorData;
      
      throw error;
    }
    
    // Check if response should be parsed as JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return response as unknown as T;
    
  } catch (error) {
    // Log the error
    secureLogger.error('API request failed:', error);
    
    // Call custom error handler if provided
    if (options.onError) {
      options.onError(error);
    }
    
    throw error;
  }
}

/**
 * Convenience method for GET requests
 */
export function get<T = any>(url: string, options: SecureFetchOptions = {}): Promise<T> {
  return secureFetch<T>(url, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export function post<T = any>(url: string, data?: any, options: SecureFetchOptions = {}): Promise<T> {
  return secureFetch<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  });
}

/**
 * Convenience method for PUT requests
 */
export function put<T = any>(url: string, data?: any, options: SecureFetchOptions = {}): Promise<T> {
  return secureFetch<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  });
}

/**
 * Convenience method for DELETE requests
 */
export function del<T = any>(url: string, options: SecureFetchOptions = {}): Promise<T> {
  return secureFetch<T>(url, { ...options, method: 'DELETE' });
}

export default {
  secureFetch,
  get,
  post,
  put,
  delete: del
};
