/**
 * Security Helper Utility
 * Provides helper functions for common security tasks
 */

import { get as secureFetchGet } from './secureFetch';
import secureLogger from './secureLogger';
import config from './environmentConfig';
import CryptoJS from 'crypto-js';

// CSRF token storage
let csrfToken: string | null = null;

/**
 * Replace hardcoded URLs with environment-based configuration
 * @param urlType The type of URL needed (api, auth, resource)
 * @param path Optional path to append
 * @returns The properly configured URL
 */
export function getConfiguredUrl(urlType: 'api' | 'auth' | 'resource', path: string = ''): string {
  switch (urlType) {
    case 'api':
      return config.getGatewayUrl(path);
    case 'auth':
      return config.getAuthUrl(path);
    case 'resource':
      return config.getResourceUrl(path);
    default:
      return path;
  }
}

/**
 * Security checks to run on app initialization
 */
export function runSecurityChecks(): void {
  // Check if running on HTTPS in production
  if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
    secureLogger.warn('Application is not running on HTTPS! This is a security risk in production.');
  }

  // Check for XSS protection headers
  secureFetchGet('/').catch(error => {
    const xssHeader = error?.response?.headers?.get('X-XSS-Protection');
    if (!xssHeader) {
      secureLogger.warn('X-XSS-Protection header is missing from responses.');
    }
  });

  // Initialize CSRF protection
  initializeCsrfProtection();
}

/**
 * Create a secure URL by ensuring the domain is allowlisted
 * @param url URL to validate
 * @returns Safe URL if valid, or empty string if invalid
 */
export function createSafeUrl(url: string): string {
  try {
    // List of allowed domains
    const allowedDomains = [
      // Add your allowed domains here
      'pilotforce.com',
      'amazonaws.com',
      'cloudfront.net'
    ];
    
    // Special case for development URLs
    if (process.env.NODE_ENV === 'development') {
      allowedDomains.push('localhost');
    }
    
    // Parse the URL to extract domain
    const urlObj = new URL(url);
    
    // Check if URL domain is in the allowlist
    if (allowedDomains.some(domain => urlObj.hostname.endsWith(domain))) {
      return url;
    }
    
    secureLogger.warn(`URL blocked by domain allowlist: ${url}`);
    return '';
  } catch (error) {
    secureLogger.error(`Invalid URL format: ${url}`);
    return '';
  }
}

/**
 * Generate a new CSRF token locally
 * Double-submit cookie pattern for CSRF protection
 */
export function generateCsrfToken(): string {
  const token = CryptoJS.lib.WordArray.random(16).toString();
  csrfToken = token;
  
  // Set the token in a cookie as well for the double-submit pattern
  document.cookie = `XSRF-TOKEN=${token}; path=/; SameSite=Strict; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`;
  
  return token;
}

/**
 * Get the current CSRF token or generate a new one
 */
export function getCsrfToken(): string {
  if (!csrfToken) {
    return generateCsrfToken();
  }
  return csrfToken;
}

/**
 * Add CSRF token to headers for API requests
 * @param headers Existing headers object
 * @returns Headers with CSRF token added
 */
export function addCsrfHeader(headers: Record<string, string> = {}): Record<string, string> {
  const token = getCsrfToken();
  return {
    ...headers,
    'X-CSRF-Token': token
  };
}

/**
 * Initialize CSRF protection
 */
export async function initializeCsrfProtection(): Promise<void> {
  try {
    // First try to get a CSRF token from the backend
    const apiUrl = config.getAuthUrl('/csrf-token');
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          // Store the server-provided token
          csrfToken = data.token;
          
          // Set the token in a cookie as well for double-submit pattern
          document.cookie = `XSRF-TOKEN=${data.token}; path=/; SameSite=Strict; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`;
          
          return;
        }
      }
    } catch (error) {
      secureLogger.warn('Failed to fetch CSRF token from server, falling back to local generation', error);
    }
    
    // If server token fetch fails, generate one locally
    generateCsrfToken();
  } catch (error) {
    secureLogger.warn('Failed to initialize CSRF protection', error);
  }
}

export default {
  getConfiguredUrl,
  runSecurityChecks,
  createSafeUrl,
  initializeCsrfProtection,
  getCsrfToken,
  addCsrfHeader
};
