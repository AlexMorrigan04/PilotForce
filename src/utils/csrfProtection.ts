/**
 * CSRF Protection Utilities
 * Provides methods to protect against Cross-Site Request Forgery
 */

import { generateRandomString } from './securityValidator';
import { secureGet, secureSet } from './secureStorage';
import logger from './logger';
import { AxiosRequestConfig, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';

// CSRF token storage key
const CSRF_TOKEN_KEY = 'csrf_token';
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Generate a new CSRF token
 * @returns CSRF token
 */
export async function generateCsrfToken(): Promise<string> {
  try {
    // Generate a random token
    const token = generateRandomString(32);
    
    // Store token with expiry time
    await secureSet(CSRF_TOKEN_KEY, JSON.stringify({
      token,
      expires: Date.now() + TOKEN_EXPIRY
    }));
    
    return token;
  } catch (error) {
    logger.error('Error generating CSRF token:', error);
    return '';
  }
}

/**
 * Get the current CSRF token or generate a new one
 * @returns Current CSRF token
 */
export async function getCsrfToken(): Promise<string> {
  try {
    // Try to get existing token
    const storedToken = await secureGet(CSRF_TOKEN_KEY);
    if (storedToken) {
      // Parse token data
      const tokenData = JSON.parse(storedToken);
      
      // Check if token is still valid
      if (tokenData.expires > Date.now()) {
        return tokenData.token;
      }
    }
    
    // Generate new token if not found or expired
    return await generateCsrfToken();
  } catch (error) {
    logger.error('Error getting CSRF token:', error);
    return await generateCsrfToken();
  }
}

/**
 * Validate a CSRF token
 * @param token CSRF token to validate
 * @returns True if token is valid
 */
export async function validateCsrfToken(token: string): Promise<boolean> {
  try {
    // Get stored token
    const storedToken = await secureGet(CSRF_TOKEN_KEY);
    if (!storedToken) return false;
    
    // Parse token data
    const tokenData = JSON.parse(storedToken);
    
    // Check if token is valid and not expired
    return tokenData.token === token && tokenData.expires > Date.now();
  } catch (error) {
    logger.error('Error validating CSRF token:', error);
    return false;
  }
}

/**
 * Add CSRF token to request headers
 * @param headers Request headers
 * @returns Headers with CSRF token
 */
export async function addCsrfToken(headers: HeadersInit = {}): Promise<HeadersInit> {
  const token = await getCsrfToken();
  return {
    ...headers,
    'X-CSRF-Token': token
  };
}

/**
 * Add CSRF token to Axios config
 * @param config Axios request config
 * @returns Updated config with CSRF token
 */
export async function addCsrfToAxios(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
  const token = await getCsrfToken();
  
  // Ensure headers exist by using AxiosHeaders if none provided
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }
  
  // Add CSRF token to headers
  config.headers.set('X-CSRF-Token', token);
  
  return config;
}

export default {
  generateCsrfToken,
  getCsrfToken,
  validateCsrfToken,
  addCsrfToken,
  addCsrfToAxios
};
