/**
 * API Configuration
 * Centralizes all API endpoints and credentials from environment variables
 */

// API Endpoints
export const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || '';
export const API_REGION = process.env.REACT_APP_API_REGION || 'eu-north-1';
export const S3_BUCKET = process.env.REACT_APP_S3_BUCKET || '';

// Auth Configuration
export const USER_POOL_ID = process.env.REACT_APP_USER_POOL_ID || '';
export const USER_POOL_WEB_CLIENT_ID = process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '';

// Cognito URL - Dynamically constructed from region and user pool
export const COGNITO_URL = USER_POOL_ID 
  ? `https://cognito-idp.${API_REGION}.amazonaws.com/${USER_POOL_ID}`
  : '';

// Default placeholder images
export const PLACEHOLDER_IMAGE = 'https://pilotforce-resources.s3.amazonaws.com/placeholders/image-placeholder.jpg';

// Development mode check
export const IS_DEV = process.env.NODE_ENV === 'development';

export default {
  API_ENDPOINT,
  API_REGION,
  USER_POOL_ID,
  USER_POOL_WEB_CLIENT_ID,
  COGNITO_URL,
  S3_BUCKET,
  PLACEHOLDER_IMAGE,
  IS_DEV
};
