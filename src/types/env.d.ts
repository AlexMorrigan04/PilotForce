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
    
    // Microsoft OAuth Configuration
    REACT_APP_MICROSOFT_CLIENT_ID: string;
    REACT_APP_MICROSOFT_TENANT_ID: string;
    REACT_APP_MICROSOFT_REDIRECT_URI: string;
    
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
    REACT_APP_PASSWORD_MIN_LENGTH?: string;
    REACT_APP_PASSWORD_REQUIRE_SYMBOLS?: string;
    REACT_APP_PASSWORD_REQUIRE_NUMBERS?: string;
    REACT_APP_PASSWORD_REQUIRE_UPPERCASE?: string;
    REACT_APP_PASSWORD_REQUIRE_LOWERCASE?: string;
    REACT_APP_MAX_LOGIN_ATTEMPTS?: string;
    REACT_APP_ACCOUNT_LOCKOUT_TIME_MINUTES?: string;
    REACT_APP_MFA_REQUIRED?: string;
    REACT_APP_CONTENT_SECURITY_POLICY?: string;
    REACT_APP_API_RATE_LIMIT?: string;
    REACT_APP_ENABLE_AUDIT_LOGGING?: string;
    REACT_APP_DATA_ENCRYPTION_KEY?: string;
    
    // Environment & Feature Flags
    REACT_APP_ENV: 'development' | 'staging' | 'production';
    REACT_APP_ENABLE_DEBUG?: string;
    
    // Node environment
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
