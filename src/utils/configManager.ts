/**
 * Configuration Manager
 * Centralizes configuration values and provides a secure way to access them
 * Removes the need for hardcoded URLs across the codebase
 */

interface EnvironmentConfig {
  apiUrl: string;
  cognitoUrl: string;
  s3BucketUrl: string;
  formspreeUrl: string;
  placeholderImageUrl: string;
  loggingServiceUrl: string;
  redirectUrl: string;
}

// Default development configuration
const devConfig: EnvironmentConfig = {
  apiUrl: process.env.REACT_APP_API_URL || 'https://localhost:5000/api',
  cognitoUrl: process.env.REACT_APP_COGNITO_URL || 'https://cognito-idp.eu-north-1.amazonaws.com/',
  s3BucketUrl: process.env.REACT_APP_S3_BUCKET_URL || '',
  formspreeUrl: process.env.REACT_APP_FORMSPREE_URL || 'https://formspree.io/f/mvgkqjvr',
  placeholderImageUrl: process.env.REACT_APP_PLACEHOLDER_URL || 'https://via.placeholder.com',
  loggingServiceUrl: process.env.REACT_APP_LOGGING_URL || '',
  redirectUrl: process.env.REACT_APP_REDIRECT_URL || 'https://localhost:3000/'
};

// Production configuration
const prodConfig: EnvironmentConfig = {
  apiUrl: process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com',
  cognitoUrl: process.env.REACT_APP_COGNITO_URL || 'https://cognito-idp.eu-north-1.amazonaws.com/',
  s3BucketUrl: process.env.REACT_APP_S3_BUCKET_URL || '',
  formspreeUrl: process.env.REACT_APP_FORMSPREE_URL || 'https://formspree.io/f/mvgkqjvr',
  placeholderImageUrl: process.env.REACT_APP_PLACEHOLDER_URL || 'https://via.placeholder.com',
  loggingServiceUrl: process.env.REACT_APP_LOGGING_URL || 'https://your-logging-service.com/api/log',
  redirectUrl: process.env.REACT_APP_REDIRECT_URL || 'https://pilotforce.com/'
};

// Get the appropriate config based on environment
const config = process.env.NODE_ENV === 'production' ? prodConfig : devConfig;

/**
 * Get the API base URL
 * @returns The base API URL
 */
export const getApiUrl = (): string => config.apiUrl;

/**
 * Get the Cognito URL
 * @returns The Cognito URL
 */
export const getCognitoUrl = (): string => config.cognitoUrl;

/**
 * Get the S3 bucket URL
 * @returns The S3 bucket URL
 */
export const getS3BucketUrl = (): string => config.s3BucketUrl;

/**
 * Get the Formspree URL
 * @returns The Formspree URL
 */
export const getFormspreeUrl = (): string => config.formspreeUrl;

/**
 * Get the placeholder image URL
 * @returns The placeholder image URL
 */
export const getPlaceholderImageUrl = (): string => config.placeholderImageUrl;

/**
 * Get the logging service URL
 * @returns The logging service URL
 */
export const getLoggingServiceUrl = (): string => config.loggingServiceUrl;

/**
 * Get the redirect URL
 * @returns The redirect URL
 */
export const getRedirectUrl = (): string => config.redirectUrl;

/**
 * Build a complete API endpoint URL
 * @param path The path to append to the base URL
 * @returns The complete URL
 */
export const buildApiUrl = (path: string): string => {
  return `${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;
};

/**
 * Build a placeholder image URL
 * @param width Width of the image
 * @param height Height of the image
 * @param text Text to display
 * @returns The complete placeholder URL
 */
export const buildPlaceholderUrl = (width = 300, height = 200, text = 'Image Not Found'): string => {
  return `${getPlaceholderImageUrl()}/${width}x${height}?text=${encodeURIComponent(text)}`;
};

export default {
  getApiUrl,
  getCognitoUrl,
  getS3BucketUrl,
  getFormspreeUrl,
  getPlaceholderImageUrl,
  getLoggingServiceUrl,
  getRedirectUrl,
  buildApiUrl,
  buildPlaceholderUrl
};
