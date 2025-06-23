/**
 * Application configuration file
 */

// API configuration
export const API_BASE_URL = process.env.REACT_APP_API_ENDPOINT || '';

// Authentication configuration
export const AUTH_CONFIG = {
  region: process.env.REACT_APP_AWS_REGION || '',
  userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
  userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || ''
};

// API headers configuration
export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Token handling
export const getAuthHeaderValue = (token: string) => {
  // The Lambda function is looking for the auth parameter in the query string
  // Not using Bearer prefix here as it's not expected by the Lambda
  return token;
};

// Lambda expects these exact field names and types - match what's in the Lambda code
export const INVITATION_SCHEMA = {
  email: 'string',       // Email address of invitee
  companyId: 'string',   // UUID of company
  role: 'string',        // User role (default: 'User')
  invitedBy: 'string'    // UUID of inviter (optional)
};

// App version
export const APP_VERSION = '1.0.0';
