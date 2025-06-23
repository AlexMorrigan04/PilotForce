/**
 * Session Configuration
 * 
 * This file contains all session-related configuration settings.
 * These values can be overridden by environment variables.
 */

export const SESSION_CONFIG = {
  // Session timeout in minutes (default: 8 hours - increased from 30 minutes)
  SESSION_TIMEOUT_MINUTES: parseInt(process.env.REACT_APP_SESSION_TIMEOUT_MINUTES || '480'),
  
  // Token refresh threshold in minutes (default: 5 minutes before expiry)
  TOKEN_REFRESH_THRESHOLD_MINUTES: parseInt(process.env.REACT_APP_TOKEN_REFRESH_THRESHOLD || '5'),
  
  // Activity check interval in minutes (default: 5 minutes)
  ACTIVITY_CHECK_INTERVAL_MINUTES: parseInt(process.env.REACT_APP_ACTIVITY_CHECK_INTERVAL || '5'),
  
  // Token health check interval in minutes (default: 10 minutes)
  TOKEN_HEALTH_CHECK_INTERVAL_MINUTES: parseInt(process.env.REACT_APP_TOKEN_HEALTH_CHECK_INTERVAL || '10'),
  
  // Maximum session duration in hours (default: 24 hours - increased from 8 hours)
  MAX_SESSION_DURATION_HOURS: parseInt(process.env.REACT_APP_MAX_SESSION_DURATION || '24'),
  
  // Inactivity timeout in minutes (default: 4 hours - increased from 30 minutes)
  INACTIVITY_TIMEOUT_MINUTES: parseInt(process.env.REACT_APP_INACTIVITY_TIMEOUT || '240'),
  
  // Auto-refresh enabled (default: true)
  AUTO_REFRESH_ENABLED: process.env.REACT_APP_AUTO_REFRESH_ENABLED !== 'false',
  
  // Cross-tab synchronization enabled (default: true)
  CROSS_TAB_SYNC_ENABLED: process.env.REACT_APP_CROSS_TAB_SYNC_ENABLED !== 'false',
  
  // Activity tracking enabled (default: true)
  ACTIVITY_TRACKING_ENABLED: process.env.REACT_APP_ACTIVITY_TRACKING_ENABLED !== 'false'
};

// Convert minutes to milliseconds for internal use
export const SESSION_TIMEOUT_MS = SESSION_CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000;
export const TOKEN_REFRESH_THRESHOLD_MS = SESSION_CONFIG.TOKEN_REFRESH_THRESHOLD_MINUTES * 60 * 1000;
export const ACTIVITY_CHECK_INTERVAL_MS = SESSION_CONFIG.ACTIVITY_CHECK_INTERVAL_MINUTES * 60 * 1000;
export const TOKEN_HEALTH_CHECK_INTERVAL_MS = SESSION_CONFIG.TOKEN_HEALTH_CHECK_INTERVAL_MINUTES * 60 * 1000;
export const MAX_SESSION_DURATION_MS = SESSION_CONFIG.MAX_SESSION_DURATION_HOURS * 60 * 60 * 1000;
export const INACTIVITY_TIMEOUT_MS = SESSION_CONFIG.INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;

// Storage keys
export const STORAGE_KEYS = {
  SESSION_ACTIVE: 'pilotforce_session_active',
  SESSION_TIMESTAMP: 'pilotforce_session_timestamp',
  LAST_ACTIVITY: 'pilotforce_last_activity',
  SESSION_TIMEOUT: 'pilotforce_session_timeout',
  USER_ACTIVE: 'pilotforce_user_active',
  SESSION_START: 'pilotforce_session_start',
  MAX_SESSION_EXPIRY: 'pilotforce_max_session_expiry'
};

// Activity tracking events
export const ACTIVITY_EVENTS = [
  'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
];

// Session timeout reasons
export const SESSION_TIMEOUT_REASONS = {
  INACTIVITY: 'inactivity',
  TOKEN_EXPIRED: 'token_expired',
  SESSION_TIMEOUT: 'session_timeout',
  MAX_DURATION: 'max_duration',
  REFRESH_FAILED: 'refresh_failed',
  REFRESH_ERROR: 'refresh_error',
  NO_REFRESH_TOKEN: 'no_refresh_token',
  NO_TOKEN: 'no_token',
  VERIFICATION_ERROR: 'verification_error'
} as const;

export type SessionTimeoutReason = typeof SESSION_TIMEOUT_REASONS[keyof typeof SESSION_TIMEOUT_REASONS]; 