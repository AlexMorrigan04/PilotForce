/**
 * Environment Configuration
 * Central place for all environment-specific configuration
 */

// Default values for local development
const DEFAULT_CONFIG = {
  // API URLs - configured via environment variables
  API: {
    BASE_URL: process.env.REACT_APP_API_BASE_URL || '/api',
    GATEWAY_URL: process.env.REACT_APP_API_GATEWAY_URL || '/api',
    RESOURCE_URL: process.env.REACT_APP_RESOURCE_API_URL || '/resources',
    AUTH_URL: process.env.REACT_APP_AUTH_API_URL || '/auth',
    ENDPOINTS: {
      LOGIN: '/auth/login',
      SIGNUP: '/auth/signup',
      CONFIRM: '/auth/confirm',
      LOGOUT: '/auth/logout',
      BOOKINGS: '/bookings',
      ASSETS: '/assets',
      USERS: '/users',
      RESOURCES: '/resources'
    }
  },
  
  // Feature flags
  FEATURES: {
    USE_CSRF: process.env.REACT_APP_USE_CSRF !== 'false',
    ENABLE_S3_DIRECT_UPLOAD: process.env.REACT_APP_ENABLE_S3_DIRECT_UPLOAD === 'true',
    ENABLE_GEOSPATIAL: process.env.REACT_APP_ENABLE_GEOSPATIAL === 'true',
    DEBUG_MODE: process.env.REACT_APP_DEBUG_MODE === 'true',
    MOCK_API: process.env.REACT_APP_MOCK_API === 'true'
  },
  
  // Auth configuration
  AUTH: {
    COGNITO_REGION: process.env.REACT_APP_COGNITO_REGION || 'eu-north-1',
    USER_POOL_ID: process.env.REACT_APP_USER_POOL_ID,
    CLIENT_ID: process.env.REACT_APP_CLIENT_ID,
    REDIRECT_URI: process.env.REACT_APP_REDIRECT_URI || window.location.origin,
    TOKEN_EXPIRY_BUFFER: 5 * 60 * 1000, // 5 minutes in ms
    SESSION_DURATION: 24 * 60 * 60 * 1000 // 24 hours in ms
  },
  
  // Storage buckets
  STORAGE: {
    RESOURCE_BUCKET: process.env.REACT_APP_RESOURCE_BUCKET || 'pilotforce-resources',
    UPLOAD_BUCKET: process.env.REACT_APP_UPLOAD_BUCKET || 'pilotforce-uploads'
  },
  
  // Logging
  LOGGING: {
    LEVEL: process.env.REACT_APP_LOG_LEVEL || 'info',
    REMOTE_URL: process.env.REACT_APP_LOGGING_SERVICE_URL
  },
  
  // Images and Media
  MEDIA: {
    PLACEHOLDER_BASE_URL: process.env.REACT_APP_PLACEHOLDER_IMAGE_URL || 'https://via.placeholder.com',
    PLACEHOLDER_WIDTH: 300,
    PLACEHOLDER_HEIGHT: 200
  }
};

/**
 * Get the API gateway URL with optional path
 * @param path Optional path to append
 * @returns Complete API gateway URL
 */
const getGatewayUrl = (path: string = ''): string => {
  const baseUrl = DEFAULT_CONFIG.API.GATEWAY_URL.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

/**
 * Get the resource API URL with optional path
 * @param path Optional path to append
 * @returns Complete resource API URL
 */
const getResourceUrl = (path: string = ''): string => {
  const baseUrl = DEFAULT_CONFIG.API.RESOURCE_URL.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

/**
 * Get the auth API URL with optional path
 * @param path Optional path to append
 * @returns Complete auth API URL
 */
const getAuthUrl = (path: string = ''): string => {
  const baseUrl = DEFAULT_CONFIG.API.AUTH_URL.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

/**
 * Check if a feature flag is enabled
 * @param flagName Name of the feature flag
 * @returns True if feature is enabled
 */
const isFeatureEnabled = (flagName: keyof typeof DEFAULT_CONFIG.FEATURES): boolean => {
  return DEFAULT_CONFIG.FEATURES[flagName];
};

/**
 * Generate a placeholder image URL with custom text
 * @param text Text to display on placeholder image
 * @param width Optional width (default from config)
 * @param height Optional height (default from config)
 * @returns URL for placeholder image
 */
const getPlaceholderImage = (text = 'Image Not Available', width?: number, height?: number): string => {
  // Use default dimensions from config if not specified
  const w = width || DEFAULT_CONFIG.MEDIA.PLACEHOLDER_WIDTH;
  const h = height || DEFAULT_CONFIG.MEDIA.PLACEHOLDER_HEIGHT;
  
  // Create a safe URL-encoded version of the text
  const safeText = encodeURIComponent(text).replace(/%20/g, '+');
  
  // Check if we're using a custom placeholder service from environment variables
  if (process.env.REACT_APP_PLACEHOLDER_IMAGE_URL) {
    return `${DEFAULT_CONFIG.MEDIA.PLACEHOLDER_BASE_URL}/${w}x${h}?text=${safeText}`;
  }
  
  // For local development, use a data URI instead of external service
  // This avoids external requests during development
  if (process.env.NODE_ENV === 'development') {
    // Create a simple SVG placeholder
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#888" text-anchor="middle" dominant-baseline="middle">${text}</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
  }
  
  // Default to placeholder.com for non-dev environments
  return `${DEFAULT_CONFIG.MEDIA.PLACEHOLDER_BASE_URL}/${w}x${h}?text=${safeText}`;
};

export default {
  ...DEFAULT_CONFIG,
  getGatewayUrl,
  getResourceUrl,
  getAuthUrl,
  isFeatureEnabled,
  getPlaceholderImage
};
