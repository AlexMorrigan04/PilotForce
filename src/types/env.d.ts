/**
 * TypeScript declarations for environment variables
 * This ensures type-safety when accessing environment variables
 */

declare namespace NodeJS {
  interface ProcessEnv {
    // AWS Configuration
    REACT_APP_AWS_REGION: string;
    REACT_APP_USER_POOL_ID: string;
    REACT_APP_USER_POOL_WEB_CLIENT_ID: string;
    REACT_APP_USER_POOL_CLIENT_SECRET?: string;
    REACT_APP_AWS_ACCESS_KEY_ID?: string;
    REACT_APP_AWS_SECRET_ACCESS_KEY?: string;
    
    // API Configuration
    REACT_APP_API_BASE_URL: string;
    REACT_APP_ENFORCE_HTTPS?: string;
    
    // Other API keys
    REACT_APP_MAPBOX_ACCESS_TOKEN?: string;
    REACT_APP_GOOGLE_MAPS_API_KEY?: string;
    REACT_APP_WEBODM_API_KEY?: string;
    REACT_APP_RESEND_API_KEY?: string;
    
    // Security Options
    REACT_APP_COGNITO_ADVANCED_SECURITY?: string;
    REACT_APP_SESSION_TIMEOUT_MINUTES?: string;
    
    // Environment & Feature Flags
    REACT_APP_ENV: 'development' | 'staging' | 'production';
    REACT_APP_ENABLE_DEBUG?: string;
    
    // Node environment
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
