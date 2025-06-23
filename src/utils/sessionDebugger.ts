/**
 * Session Debugger - Utilities for debugging session issues
 * 
 * This module provides functions to inspect and debug session state,
 * token validity, and timeout issues.
 */

import { getTokenInfo } from './tokenDebugger';
import { SESSION_CONFIG, STORAGE_KEYS, SESSION_TIMEOUT_REASONS } from '../config/sessionConfig';

/**
 * Get comprehensive session status information
 */
export const getSessionStatus = () => {
  const now = Date.now();
  
  // Get tokens
  const idToken = localStorage.getItem('idToken') || sessionStorage.getItem('idToken');
  const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  
  // Get session timestamps
  const sessionStart = localStorage.getItem(STORAGE_KEYS.SESSION_START);
  const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
  const sessionTimeout = localStorage.getItem(STORAGE_KEYS.SESSION_TIMEOUT);
  const maxSessionExpiry = localStorage.getItem(STORAGE_KEYS.MAX_SESSION_EXPIRY);
  
  // Calculate time differences
  const sessionAge = sessionStart ? now - parseInt(sessionStart) : 0;
  const timeSinceActivity = lastActivity ? now - parseInt(lastActivity) : 0;
  const timeUntilTimeout = sessionTimeout ? parseInt(sessionTimeout) - now : 0;
  const timeUntilMaxExpiry = maxSessionExpiry ? parseInt(maxSessionExpiry) - now : 0;
  
  // Token analysis
  const tokenInfo = idToken ? getTokenInfo(idToken) : null;
  
  return {
    // Session state
    isActive: !!localStorage.getItem(STORAGE_KEYS.SESSION_ACTIVE),
    hasToken: !!idToken,
    hasRefreshToken: !!refreshToken,
    
    // Timestamps
    sessionStart: sessionStart ? new Date(parseInt(sessionStart)).toISOString() : null,
    lastActivity: lastActivity ? new Date(parseInt(lastActivity)).toISOString() : null,
    sessionTimeout: sessionTimeout ? new Date(parseInt(sessionTimeout)).toISOString() : null,
    maxSessionExpiry: maxSessionExpiry ? new Date(parseInt(maxSessionExpiry)).toISOString() : null,
    
    // Time calculations
    sessionAgeMinutes: Math.round(sessionAge / (60 * 1000)),
    timeSinceActivityMinutes: Math.round(timeSinceActivity / (60 * 1000)),
    timeUntilTimeoutMinutes: Math.round(timeUntilTimeout / (60 * 1000)),
    timeUntilMaxExpiryMinutes: Math.round(timeUntilMaxExpiry / (60 * 1000)),
    
    // Token information
    tokenValid: tokenInfo?.isValid || false,
    tokenExpired: tokenInfo?.isExpired || true,
    tokenExpiresAt: tokenInfo?.expiresAt?.toISOString() || null,
    timeToTokenExpiry: tokenInfo?.timeToExpiry ? Math.round(tokenInfo.timeToExpiry / (60 * 1000)) : null,
    
    // Configuration
    config: {
      sessionTimeoutMinutes: SESSION_CONFIG.SESSION_TIMEOUT_MINUTES,
      tokenRefreshThresholdMinutes: SESSION_CONFIG.TOKEN_REFRESH_THRESHOLD_MINUTES,
      maxSessionDurationHours: SESSION_CONFIG.MAX_SESSION_DURATION_HOURS,
      inactivityTimeoutMinutes: SESSION_CONFIG.INACTIVITY_TIMEOUT_MINUTES
    }
  };
};

/**
 * Check if session is in a healthy state
 */
export const isSessionHealthy = (): { healthy: boolean; issues: string[] } => {
  const status = getSessionStatus();
  const issues: string[] = [];
  
  // Check if session is active
  if (!status.isActive) {
    issues.push('Session is not marked as active');
  }
  
  // Check if token exists and is valid
  if (!status.hasToken) {
    issues.push('No ID token found');
  } else if (status.tokenExpired) {
    issues.push('ID token is expired');
  }
  
  // Check if refresh token exists
  if (!status.hasRefreshToken) {
    issues.push('No refresh token found');
  }
  
  // Check session timeout
  if (status.timeUntilTimeoutMinutes < 0) {
    issues.push('Session timeout has been reached');
  }
  
  // Check maximum session duration
  if (status.timeUntilMaxExpiryMinutes < 0) {
    issues.push('Maximum session duration has been reached');
  }
  
  // Check inactivity
  if (status.timeSinceActivityMinutes > SESSION_CONFIG.INACTIVITY_TIMEOUT_MINUTES) {
    issues.push('User has been inactive for too long');
  }
  
  // Check if token is close to expiring
  if (status.timeToTokenExpiry !== null && status.timeToTokenExpiry < SESSION_CONFIG.TOKEN_REFRESH_THRESHOLD_MINUTES) {
    issues.push('Token is close to expiring and needs refresh');
  }
  
  return {
    healthy: issues.length === 0,
    issues
  };
};

/**
 * Generate a detailed session report for debugging
 */
export const generateSessionReport = (): string => {
  const status = getSessionStatus();
  const health = isSessionHealthy();
  
  let report = '=== Session Status Report ===\n\n';
  
  // Session state
  report += `Session Active: ${status.isActive}\n`;
  report += `Has Token: ${status.hasToken}\n`;
  report += `Has Refresh Token: ${status.hasRefreshToken}\n\n`;
  
  // Timestamps
  report += `Session Start: ${status.sessionStart}\n`;
  report += `Last Activity: ${status.lastActivity}\n`;
  report += `Session Timeout: ${status.sessionTimeout}\n`;
  report += `Max Session Expiry: ${status.maxSessionExpiry}\n\n`;
  
  // Time calculations
  report += `Session Age: ${status.sessionAgeMinutes} minutes\n`;
  report += `Time Since Activity: ${status.timeSinceActivityMinutes} minutes\n`;
  report += `Time Until Timeout: ${status.timeUntilTimeoutMinutes} minutes\n`;
  report += `Time Until Max Expiry: ${status.timeUntilMaxExpiryMinutes} minutes\n\n`;
  
  // Token information
  report += `Token Valid: ${status.tokenValid}\n`;
  report += `Token Expired: ${status.tokenExpired}\n`;
  report += `Token Expires At: ${status.tokenExpiresAt}\n`;
  report += `Time To Token Expiry: ${status.timeToTokenExpiry} minutes\n\n`;
  
  // Health status
  report += `Session Healthy: ${health.healthy}\n`;
  if (health.issues.length > 0) {
    report += `Issues:\n`;
    health.issues.forEach(issue => {
      report += `  - ${issue}\n`;
    });
  }
  
  return report;
};

/**
 * Log session status to console for debugging
 */
export const logSessionStatus = (): void => {
  console.group('Session Status');
  console.log(getSessionStatus());
  console.groupEnd();
};

/**
 * Log session health to console for debugging
 */
export const logSessionHealth = (): void => {
  const health = isSessionHealthy();
  console.group('Session Health');
  console.log(`Healthy: ${health.healthy}`);
  if (health.issues.length > 0) {
    console.warn('Issues:', health.issues);
  }
  console.groupEnd();
}; 