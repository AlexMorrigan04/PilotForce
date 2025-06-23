// Import statements at the top
import { API_BASE_URL } from './endpoints';
import { addCsrfHeader, getCsrfToken } from './securityHelper';

// Implementing local versions of sessionUtils functions to fix missing import
// isAuthenticated checks if a valid ID token exists
const isAuthenticated = (): boolean => {
  const token = getIdToken();
  return !!token;
};

// getIdToken retrieves an ID token from localStorage
const getIdToken = (): string | null => {
  return localStorage.getItem('idToken');
};

// SecureSession simulates the original implementation with sessionStorage
const SecureSession = {
  setItem: (key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      // Silent fail
    }
  },
  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },
  removeItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      // Silent fail
    }
  }
};

// Use environment variables for API configuration
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || API_BASE_URL,
  TIMEOUT: 30000, // 30 seconds timeout
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000, // 1 second
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  }
};

// Custom error for API requests with limited details
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    // Generic messages for common status codes to avoid information leakage
    let sanitizedMessage = message;
    
    // Replace specific error messages with generic ones for security
    switch (status) {
      case 401:
        sanitizedMessage = 'Authentication required';
        break;
      case 403:
        sanitizedMessage = 'Access denied';
        break;
      case 404:
        sanitizedMessage = 'Resource not found';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        sanitizedMessage = 'Server error';
        break;
      default:
        // Use generic message if status code isn't specifically handled
        if (status >= 400) {
          sanitizedMessage = 'Request error';
        }
    }
    
    super(sanitizedMessage);
    this.name = 'ApiError';
    this.status = status;
    
    // Prevent stack trace from being exposed
    if (process.env.NODE_ENV === 'production') {
      this.stack = '';
    }
  }
}

/**
 * Function to validate Amplify configuration
 * This ensures required configs are present before making API calls
 * @returns {boolean} - Whether the configuration is valid
 */
export const validateAmplifyConfig = (): boolean => {
  const requiredConfigs = [
    process.env.REACT_APP_API_BASE_URL || API_CONFIG.BASE_URL,
    process.env.REACT_APP_USER_POOL_ID,
    process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
    process.env.REACT_APP_AWS_REGION
  ];
  
  // Check if any required configs are missing
  const missingConfigs = requiredConfigs.some(config => !config);
  
  if (missingConfigs) {
    // Log generic error without details in production
    if (process.env.NODE_ENV === 'production') {
    } else {
    }
    return false;
  }
  
  return true;
};

/**
 * Get the base URL for API calls
 * @returns {string} - The base URL for API calls
 */
export const getApiBaseUrl = (): string => {
  return process.env.REACT_APP_API_BASE_URL || API_CONFIG.BASE_URL;
};

/**
 * Create headers for API requests with security best practices
 * @param includeAuth Whether to include authentication token
 * @returns Headers object
 */
export const createHeaders = (includeAuth: boolean = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Helps prevent CSRF
    'Accept': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    ...API_CONFIG.SECURITY_HEADERS
  };
  
  // Add auth token if needed and available
  if (includeAuth && isAuthenticated()) {
    const token = getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Add CSRF token header for state-changing operations
  return {
    ...headers,
    'X-CSRF-Token': getCsrfToken()
  };
};

/**
 * Enforce HTTPS for all API requests in production
 * @param url The URL to check and modify if needed
 * @returns Secure URL using HTTPS
 */
const enforceHttps = (url: string): string => {
  if (process.env.NODE_ENV === 'production' || 
      process.env.REACT_APP_ENFORCE_HTTPS === 'true') {
    return url.replace(/^http:\/\//i, 'https://');
  }
  return url;
};

/**
 * Generic API interface for REST operations
 */
export const API = {
  /**
   * Make a GET request
   * @param path - API path
   * @param options - Fetch options
   */
  get: async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
    return apiGet<T>(path);
  },
  
  /**
   * Make a POST request
   * @param path - API path
   * @param data - Request body
   * @param options - Fetch options
   */
  post: async <T = any>(path: string, data: any, options: RequestInit = {}): Promise<T> => {
    return apiPost<T>(path, data);
  },
  
  /**
   * Make a PUT request
   * @param path - API path
   * @param data - Request body
   * @param options - Fetch options
   */
  put: async <T = any>(path: string, data: any, options: RequestInit = {}): Promise<T> => {
    return apiPut<T>(path, data);
  },
  
  /**
   * Make a DELETE request
   * @param path - API path
   * @param options - Fetch options
   */
  del: async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
    return apiDelete<T>(path);
  }
};

/**
 * Sanitize input data to prevent XSS and injection attacks
 * @param data Data to sanitize
 * @returns Sanitized data
 */
const sanitizeRequestData = (data: any): any => {
  if (!data) return data;
  
  // For strings, remove potential XSS content
  if (typeof data === 'string') {
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, 'data-disabled-handler=');
  }
  
  // For objects, recursively sanitize properties
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map(item => sanitizeRequestData(item));
    }
    
    const sanitized: Record<string, any> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitized[key] = sanitizeRequestData(data[key]);
      }
    }
    return sanitized;
  }
  
  // Return as is for other types
  return data;
};

/**
 * Secure fetch with timeout, error handling, and security headers
 * @param endpoint API endpoint
 * @param options Fetch options
 * @param retryCount Current retry attempt (for internal use)
 * @returns Promise with response
 */
export const secureFetch = async (
  endpoint: string, 
  options: RequestInit = {},
  retryCount: number = 0
): Promise<Response> => {
  // Ensure endpoint starts with '/'
  const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = enforceHttps(API_CONFIG.BASE_URL);
  const url = `${baseUrl}${sanitizedEndpoint}`;
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
  
  try {
    // Set secure defaults
    const secureOptions: RequestInit = {
      ...options,
      credentials: 'same-origin', // Ensure cookies are sent
      signal: controller.signal,
      cache: 'no-store', // Prevent caching of sensitive data
      referrerPolicy: 'strict-origin-when-cross-origin', // Restrict referrer information
      headers: {
        ...createHeaders(true),
        ...(options.headers || {})
      }
    };
    
    // Sanitize request body if present
    if (secureOptions.body && typeof secureOptions.body === 'string') {
      try {
        const parsedBody = JSON.parse(secureOptions.body);
        const sanitizedBody = sanitizeRequestData(parsedBody);
        secureOptions.body = JSON.stringify(sanitizedBody);
      } catch (e) {
        // If JSON parsing fails, use the original body
      }
    }
    
    const response = await fetch(url, secureOptions);
    clearTimeout(timeoutId);
    
    // Store response status code securely for logging
    SecureSession.setItem(`lastApiStatus_${Date.now()}`, response.status.toString());
    
    // Check if we should retry based on status code
    if (!response.ok) {
      const status = response.status;
      
      // Retry on specific error codes if we haven't exceeded the retry limit
      if (retryCount < API_CONFIG.MAX_RETRIES && 
          (status === 408 || status === 429 || status === 503 || status === 504)) {
        // Exponential backoff
        const delay = API_CONFIG.RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return secureFetch(endpoint, options, retryCount + 1);
      }
      
      throw new ApiError(`API request failed with status: ${status}`, status);
    }
    
    // Check content-type header for JSON responses to prevent MIME confusion attacks
    const contentType = response.headers.get('content-type');
    if ((options.method === 'GET' || options.method === undefined) && 
        (!contentType || !contentType.includes('application/json'))) {
      throw new ApiError('Invalid response content type', 400);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      
      // Don't expose error details in production
      if (process.env.NODE_ENV === 'production') {
        throw new ApiError('API request failed', 500);
      } else {
        throw new ApiError(`API request failed: ${error.message}`, 500);
      }
    }
    
    // Generic error without exposing details
    throw new ApiError('API request failed', 500);
  }
};

/**
 * Perform GET request
 * @param endpoint API endpoint
 * @returns Promise with JSON response
 */
export const apiGet = async <T = any>(endpoint: string): Promise<T> => {
  const response = await secureFetch(endpoint, { method: 'GET' });
  return await response.json();
};

/**
 * Perform POST request
 * @param endpoint API endpoint
 * @param data Request payload
 * @returns Promise with JSON response
 */
export const apiPost = async <T = any>(endpoint: string, data: any): Promise<T> => {
  // Sanitize input data
  const sanitizedData = sanitizeRequestData(data);
  
  const response = await secureFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(sanitizedData)
  });
  return await response.json();
};

/**
 * Perform PUT request
 * @param endpoint API endpoint
 * @param data Request payload
 * @returns Promise with JSON response
 */
export const apiPut = async <T = any>(endpoint: string, data: any): Promise<T> => {
  // Sanitize input data
  const sanitizedData = sanitizeRequestData(data);
  
  const response = await secureFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(sanitizedData)
  });
  return await response.json();
};

/**
 * Perform DELETE request
 * @param endpoint API endpoint
 * @returns Promise with JSON response
 */
export const apiDelete = async <T = any>(endpoint: string): Promise<T> => {
  const response = await secureFetch(endpoint, { 
    method: 'DELETE',
    headers: {
      // Additional security for destructive operations
      'X-Confirm-Delete': 'true'
    }
  });
  return await response.json();
};

export default {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  secureFetch,
  createHeaders,
  validateAmplifyConfig,
  getApiBaseUrl,
  API,
  ApiError
};
