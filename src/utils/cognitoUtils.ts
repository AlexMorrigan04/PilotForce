/**
 * Utilities for AWS Cognito authentication
 * Implements security best practices for token handling
 */
import { createHmac } from 'crypto-browserify';
import { Buffer } from 'buffer';
import { API_BASE_URL } from './endpoints';
import { SecureSession } from './sessionUtils';

// Base API URL from environment or default
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || API_BASE_URL,
  COGNITO_REGION: process.env.REACT_APP_AWS_REGION || 'eu-north-1',
  TOKEN_EXPIRY_BUFFER: 300 // 5 minutes buffer before token expiry to refresh
};

// Define allowed Cognito domains for security
const ALLOWED_COGNITO_DOMAINS = [
  'cognito-idp.eu-north-1.amazonaws.com',
  'cognito-idp.eu-west-1.amazonaws.com',
  'cognito-idp.us-east-1.amazonaws.com'
];

/**
 * Get the API endpoint from environment
 * @returns The API endpoint URL
 */
export const getApiEndpoint = (): string => {
  const apiUrl = API_CONFIG.BASE_URL;
  
  // Security: Force HTTPS in production
  if (process.env.NODE_ENV === 'production' && apiUrl.startsWith('http:')) {
    return apiUrl.replace('http:', 'https:');
  }
  
  return apiUrl;
};

/**
 * Validate Cognito configuration
 * @returns Boolean indicating if configuration is valid
 */
export const validateCognitoConfig = (): boolean => {
  const requiredConfigs = [
    process.env.REACT_APP_USER_POOL_ID,
    process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
    process.env.REACT_APP_AWS_REGION
  ];
  
  return requiredConfigs.every(config => !!config);
};

/**
 * Get Cognito configuration
 * @returns Cognito configuration object with secure defaults
 */
export const getCognitoConfig = () => {
  const region = process.env.REACT_APP_AWS_REGION || API_CONFIG.COGNITO_REGION;
  
  // Validate region for security
  if (!['eu-north-1', 'eu-west-1', 'us-east-1', 'us-west-2'].includes(region)) {
    throw new Error('Invalid AWS region');
  }
  
  return {
    region,
    userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '',
    authenticationFlowType: 'USER_PASSWORD_AUTH',
    // Security best practices
    cookieStorage: {
      domain: window.location.hostname,
      secure: process.env.NODE_ENV === 'production', // Secure cookies in production
      path: '/',
      expires: 365
    },
    // Enhanced security
    advancedSecurityDataCollection: process.env.REACT_APP_COGNITO_ADVANCED_SECURITY === 'true'
  };
};

/**
 * Get Cognito client ID from environment variables
 * @returns The client ID string
 */
export const getClientId = (): string => {
  return process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '';
};

/**
 * Get Cognito client secret from environment variables
 * @returns The client secret string
 */
export const getClientSecret = (): string => {
  return process.env.REACT_APP_USER_POOL_CLIENT_SECRET || '';
};

/**
 * Calculate a secret hash using HMAC SHA256
 * This is required for Cognito API calls with client secret
 * 
 * @param username The username attempting to authenticate
 * @param clientId The Cognito app client ID (optional - will use env var if not provided)
 * @param clientSecret The Cognito app client secret (optional - will use env var if not provided)
 * @returns The calculated secret hash or empty string if missing config
 */
export const calculateSecretHash = (
  username: string, 
  clientId?: string, 
  clientSecret?: string
): string => {
  try {
    if (!username) {
      return '';
    }
    
    // Sanitize username input
    const sanitizedUsername = username.trim().toLowerCase();
    
    // Use provided values or get from environment
    const appClientId = clientId || getClientId();
    const appClientSecret = clientSecret || getClientSecret();
    
    if (!appClientId || !appClientSecret) {
      // Generic error to avoid information disclosure
      return '';
    }
    
    // Create a hash with the client secret key
    const hmac = createHmac('sha256', appClientSecret);
    
    // Update with the client ID and username
    hmac.update(sanitizedUsername + appClientId);
    
    // Return base64-encoded hash digest
    return hmac.digest('base64');
  } catch (error) {
    // Don't log sensitive operation errors in production
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error calculating secret hash');
    }
    return '';
  }
};

/**
 * Validate token issuer for security
 * @param issuer The token issuer
 * @returns Boolean indicating if it's a valid issuer
 */
const isValidIssuer = (issuer: string): boolean => {
  if (!issuer) return false;
  
  return ALLOWED_COGNITO_DOMAINS.some(domain => 
    issuer.includes(domain));
};

/**
 * Parse JWT token to get user information
 * @param token JWT token
 * @returns Parsed token or null if invalid
 */
export const parseJwt = (token: string): any => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }
    
    // Validate token format
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return null;
    }
    
    // Split the token and get the payload part
    const base64Url = tokenParts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode the base64 string
    let jsonPayload;
    try {
      jsonPayload = atob(base64);
    } catch (e) {
      return null;
    }
    
    // Parse JSON safely
    try {
      const parsed = JSON.parse(jsonPayload);
      
      // Validate issuer for security
      if (!isValidIssuer(parsed.iss)) {
        return null;
      }
      
      return parsed;
    } catch (e) {
      return null;
    }
  } catch (e) {
    return null;
  }
};

/**
 * Secure method to get token remaining lifetime
 * @param token JWT token
 * @returns Number of seconds before token expires or 0 if expired/invalid
 */
export const getTokenRemainingTime = (token: string): number => {
  try {
    const decoded = parseJwt(token);
    
    if (!decoded || !decoded.exp) {
      return 0;
    }
    
    // exp is in seconds, Date.now() is in milliseconds
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = decoded.exp - currentTime;
    
    return remainingTime > 0 ? remainingTime : 0;
  } catch (e) {
    return 0;
  }
};

/**
 * Check if a token is expired
 * @param token JWT token
 * @returns Boolean indicating if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  return getTokenRemainingTime(token) <= API_CONFIG.TOKEN_EXPIRY_BUFFER;
};

/**
 * Check if token needs to be refreshed soon
 * @param token JWT token
 * @returns Boolean indicating if token should be refreshed soon
 */
export const shouldRefreshToken = (token: string): boolean => {
  const remainingTime = getTokenRemainingTime(token);
  // If token will expire in the next 5 minutes, refresh it
  return remainingTime > 0 && remainingTime <= API_CONFIG.TOKEN_EXPIRY_BUFFER;
};

/**
 * Securely store authentication tokens
 * @param tokens Object containing id, access, and refresh tokens
 */
export const storeAuthTokens = (tokens: {
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}): void => {
  // Store tokens securely
  if (tokens.idToken) {
    SecureSession.setItem('idToken', tokens.idToken);
  }
  
  if (tokens.accessToken) {
    SecureSession.setItem('accessToken', tokens.accessToken);
  }
  
  if (tokens.refreshToken) {
    SecureSession.setItem('refreshToken', tokens.refreshToken);
  }
  
  // Store expiration time
  if (tokens.expiresIn) {
    const expirationTime = Date.now() + (tokens.expiresIn * 1000);
    SecureSession.setItem('tokenExpiration', expirationTime.toString());
  }
  
  // Remove any tokens from localStorage for security
  try {
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
  } catch (e) {
    // Silent fail
  }
};

/**
 * Clear all authentication tokens
 */
export const clearAuthTokens = (): void => {
  // Clear tokens from session storage
  SecureSession.removeItem('idToken');
  SecureSession.removeItem('accessToken');
  SecureSession.removeItem('refreshToken');
  SecureSession.removeItem('tokenExpiration');
  
  // Clear any legacy tokens from localStorage
  try {
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
  } catch (e) {
    // Silent fail
  }
};

export default {
  getApiEndpoint,
  validateCognitoConfig,
  getCognitoConfig,
  getClientId,
  getClientSecret,
  calculateSecretHash,
  parseJwt,
  isTokenExpired,
  shouldRefreshToken,
  storeAuthTokens,
  clearAuthTokens
};
