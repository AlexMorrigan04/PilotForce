/**
 * API Client Utility
 * Provides methods to make API requests
 */

import { getCsrfToken } from './csrfProtection';
import { getAuthTokens } from './secureStorage';
import { sanitizeId } from './securityValidator';

// Base API URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.example.com';

/**
 * Prepare headers with authentication and CSRF tokens
 * @param contentType Content type header
 * @returns Headers object with tokens
 */
export async function prepareHeaders(contentType = 'application/json'): Promise<Record<string, string>> {
  // Initialize headers with content type
  const newHeaders: Record<string, string> = {
    'Content-Type': contentType
  };
  
  // Get auth token if available
  const tokens = getAuthTokens();
  const token = tokens?.idToken;
  
  if (token) {
    newHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  // Add CSRF token for non-GET requests
  const csrfToken = await getCsrfToken();
  newHeaders['X-CSRF-Token'] = csrfToken;
  
  return newHeaders;
}

/**
 * Make a GET request
 * @param endpoint API endpoint
 * @param params Query parameters
 * @returns Response data
 */
export async function get(endpoint: string, params = {}): Promise<any> {
  const headers = await prepareHeaders();
  
  const queryString = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  
  const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get a resource by ID
 * @param endpoint Base endpoint
 * @param id Resource ID
 * @returns Resource data
 */
export async function getResourceById(endpoint: string, id: string): Promise<any> {
  const sanitizedId = sanitizeId(id);
  return get(`${endpoint}/${sanitizedId}`);
}

/**
 * Make a POST request
 * @param endpoint API endpoint
 * @param data Request body
 * @returns Response data
 */
export async function post(endpoint: string, data: any): Promise<any> {
  const headers = await prepareHeaders();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Make a PUT request
 * @param endpoint API endpoint
 * @param data Request body
 * @returns Response data
 */
export async function put(endpoint: string, data: any): Promise<any> {
  const headers = await prepareHeaders();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Make a DELETE request
 * @param endpoint API endpoint
 * @returns Response data
 */
export async function del(endpoint: string): Promise<any> {
  const headers = await prepareHeaders();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

export default {
  get,
  getResourceById,
  post,
  put,
  del
};