/**
 * Enhanced Session Manager - Handles auth session persistence and timeout management
 * 
 * This utility provides robust session management with:
 * - User activity tracking
 * - Configurable timeout periods
 * - Automatic token refresh
 * - Graceful session expiration handling
 * - Cross-tab synchronization
 */

import { shouldRefreshToken, isTokenExpired } from './tokenDebugger';
import { refreshToken as refreshAuthToken } from '../services/authServices';
import { 
  storeAuthTokens, 
  getAuthToken, 
  getRefreshToken as getStoredRefreshToken, 
  initializeSession,
  clearAuthData
} from './sessionPersistence';
import {
  SESSION_CONFIG,
  SESSION_TIMEOUT_MS,
  TOKEN_REFRESH_THRESHOLD_MS,
  ACTIVITY_CHECK_INTERVAL_MS,
  TOKEN_HEALTH_CHECK_INTERVAL_MS,
  MAX_SESSION_DURATION_MS,
  INACTIVITY_TIMEOUT_MS,
  STORAGE_KEYS,
  ACTIVITY_EVENTS,
  SESSION_TIMEOUT_REASONS,
  SessionTimeoutReason
} from '../config/sessionConfig';

/**
 * Enhanced SessionManager class with improved timeout handling
 */
export class SessionManager {
  private heartbeatInterval: number | null = null;
  private activityCheckInterval: number | null = null;
  private tokenHealthInterval: number | null = null;
  private refreshTokenCallback: (() => Promise<boolean>) | null = null;
  private hasAutoRefreshEnabled: boolean = true;
  private isUserActive: boolean = true;
  private sessionTimeoutCallback: (() => void) | null = null;
  private lastActivityTime: number = Date.now();

  /**
   * Initialize the session manager
   * @param refreshCallback Optional callback for token refresh
   * @param timeoutCallback Optional callback for session timeout
   */
  constructor(
    refreshCallback?: () => Promise<boolean>,
    timeoutCallback?: (() => void) | null
  ) {
    this.refreshTokenCallback = refreshCallback || this.defaultRefreshToken.bind(this);
    this.sessionTimeoutCallback = timeoutCallback || null;
    this.initSessionTracking();
    this.setupActivityTracking();
  }

  /**
   * Initialize session tracking and start monitoring
   */
  private initSessionTracking(): void {
    // Initialize session from stored data
    const { isAuthenticated, token } = initializeSession();
    
    if (isAuthenticated && token) {
      this.startSessionMonitoring();
      this.updateLastActivity();
    } else if (token) {
      // We have a token but it might be expired, try to refresh it
      this.checkTokenHealth();
    }

    // Listen for storage events to synchronize between tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  /**
   * Set up user activity tracking
   */
  private setupActivityTracking(): void {
    // Track user activity events
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, this.handleUserActivity.bind(this), { passive: true });
    });

    // Track focus/blur events
    window.addEventListener('focus', this.handleUserActivity.bind(this));
    window.addEventListener('blur', this.handleUserActivity.bind(this));
  }

  /**
   * Handle user activity to extend session
   */
  private handleUserActivity = (): void => {
    if (this.isUserActive) {
      this.updateLastActivity();
    }
  };

  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      // Page became visible, check if session is still valid
      this.checkSessionValidity();
    }
  };

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(): void {
    this.lastActivityTime = Date.now();
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, this.lastActivityTime.toString());
    try {
      sessionStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, this.lastActivityTime.toString());
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Start all session monitoring intervals
   */
  public startSessionMonitoring(): void {
    this.stopSessionMonitoring(); // Clear any existing intervals

    // Start activity checking
    this.activityCheckInterval = window.setInterval(() => {
      this.checkUserActivity();
    }, ACTIVITY_CHECK_INTERVAL_MS);

    // Start token health checking
    this.tokenHealthInterval = window.setInterval(() => {
      this.checkTokenHealth();
    }, TOKEN_HEALTH_CHECK_INTERVAL_MS);

    // Mark session as active
    localStorage.setItem(STORAGE_KEYS.SESSION_ACTIVE, 'true');
    localStorage.setItem(STORAGE_KEYS.USER_ACTIVE, 'true');
    try {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_ACTIVE, 'true');
      sessionStorage.setItem(STORAGE_KEYS.USER_ACTIVE, 'true');
    } catch (e) {
      // Silent fail
    }

    this.updateLastActivity();
  }

  /**
   * Stop all session monitoring intervals
   */
  public stopSessionMonitoring(): void {
    if (this.activityCheckInterval) {
      window.clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
    if (this.tokenHealthInterval) {
      window.clearInterval(this.tokenHealthInterval);
      this.tokenHealthInterval = null;
    }
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Check if user has been active recently
   */
  private checkUserActivity(): void {
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    const timeoutMs = INACTIVITY_TIMEOUT_MS;

    if (timeSinceActivity > timeoutMs) {
      // User has been inactive for too long
      this.handleSessionTimeout(SESSION_TIMEOUT_REASONS.INACTIVITY);
    } else {
      // User is still active, extend session
      this.updateLastActivity();
    }
  }

  /**
   * Check if the current session is still valid
   */
  private checkSessionValidity(): void {
    const token = this.getIdToken();
    
    if (!token) {
      this.handleSessionTimeout(SESSION_TIMEOUT_REASONS.NO_TOKEN);
      return;
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
      this.handleSessionTimeout(SESSION_TIMEOUT_REASONS.TOKEN_EXPIRED);
      return;
    }

    // Check if session timeout has been reached
    const timeoutStr = localStorage.getItem(STORAGE_KEYS.SESSION_TIMEOUT);
    if (timeoutStr) {
      const timeout = parseInt(timeoutStr);
      if (Date.now() > timeout) {
        this.handleSessionTimeout(SESSION_TIMEOUT_REASONS.SESSION_TIMEOUT);
        return;
      }
    }

    // Check if maximum session duration has been reached
    const sessionStartStr = localStorage.getItem(STORAGE_KEYS.SESSION_START);
    if (sessionStartStr) {
      const sessionStart = parseInt(sessionStartStr);
      if (Date.now() - sessionStart > MAX_SESSION_DURATION_MS) {
        this.handleSessionTimeout(SESSION_TIMEOUT_REASONS.MAX_DURATION);
        return;
      }
    }
  }

  /**
   * Handle session timeout
   */
  private handleSessionTimeout(reason: SessionTimeoutReason): void {
    console.warn(`Session timeout: ${reason}`);
    
    // Clear session data
    this.clearSession();
    
    // Call timeout callback if provided
    if (this.sessionTimeoutCallback) {
      this.sessionTimeoutCallback();
    }
    
    // Redirect to login page
    if (window.location.pathname !== '/login') {
      window.location.href = `/login?reason=${reason}`;
    }
  }

  /**
   * Check token health and refresh if needed
   */
  private async checkTokenHealth(): Promise<void> {
    const idToken = this.getIdToken();
    
    if (!this.hasAutoRefreshEnabled || !idToken) return;
    
    if (shouldRefreshToken(idToken, SESSION_CONFIG.TOKEN_REFRESH_THRESHOLD_MINUTES)) {
      if (this.canRefreshToken()) {
        try {
          const success = await this.refreshTokenCallback!();
          if (!success) {
            this.handleSessionTimeout(SESSION_TIMEOUT_REASONS.REFRESH_FAILED);
          }
        } catch (error) {
          console.error('Token refresh error:', error);
          this.handleSessionTimeout(SESSION_TIMEOUT_REASONS.REFRESH_ERROR);
        }
      } else {
        this.handleSessionTimeout(SESSION_TIMEOUT_REASONS.NO_REFRESH_TOKEN);
      }
    }
  }

  /**
   * Default token refresh implementation
   */
  private async defaultRefreshToken(): Promise<boolean> {
    try {
      const result = await refreshAuthToken();
      return result.success;
    } catch (error) {
      console.error('Default token refresh failed:', error);
      return false;
    }
  }

  /**
   * Store authentication tokens and start monitoring
   */
  public storeTokens(tokens: {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    [key: string]: any;
  }): void {
    try {
      // Store tokens
      storeAuthTokens(
        tokens.idToken || null,
        tokens.refreshToken || null,
        tokens.accessToken || null
      );

      // Store entire tokens object as JSON
      if (Object.keys(tokens).length > 0) {
        const tokensStr = JSON.stringify(tokens);
        localStorage.setItem('tokens', tokensStr);
        try { 
          sessionStorage.setItem('tokens', tokensStr); 
        } catch (e) {}
      }

      // Set session start time
      const sessionStart = Date.now();
      localStorage.setItem(STORAGE_KEYS.SESSION_START, sessionStart.toString());
      try {
        sessionStorage.setItem(STORAGE_KEYS.SESSION_START, sessionStart.toString());
      } catch (e) {}

      // Set maximum session expiry
      const maxSessionExpiry = sessionStart + MAX_SESSION_DURATION_MS;
      localStorage.setItem(STORAGE_KEYS.MAX_SESSION_EXPIRY, maxSessionExpiry.toString());
      try {
        sessionStorage.setItem(STORAGE_KEYS.MAX_SESSION_EXPIRY, maxSessionExpiry.toString());
      } catch (e) {}

      // Set session timeout
      const timeoutAt = Date.now() + SESSION_TIMEOUT_MS;
      localStorage.setItem(STORAGE_KEYS.SESSION_TIMEOUT, timeoutAt.toString());
      try {
        sessionStorage.setItem(STORAGE_KEYS.SESSION_TIMEOUT, timeoutAt.toString());
      } catch (e) {}

      // Start session monitoring
      this.startSessionMonitoring();
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  /**
   * Get ID token with fallback logic
   */
  public getIdToken(): string | null {
    return getAuthToken();
  }

  /**
   * Get refresh token with fallback logic
   */
  public getRefreshToken(): string | null {
    return getStoredRefreshToken();
  }

  /**
   * Check if we can refresh the token
   */
  public canRefreshToken(): boolean {
    return !!this.getRefreshToken();
  }

  /**
   * Get user data from storage
   */
  public getUserData(): any {
    try {
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Store user data in both localStorage and sessionStorage
   * @param user User data object
   */
  public storeUserData(user: any): void {
    if (!user) return;

    try {
      // Store the user data in localStorage
      const userStr = JSON.stringify(user);
      localStorage.setItem('user', userStr);
      try { 
        sessionStorage.setItem('user', userStr); 
      } catch (e) {}
      
      // Also use the session persistence utility if available
      storeAuthTokens(null, null, null, user);
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  /**
   * Clear all authentication data and stop monitoring
   */
  public clearSession(): void {
    this.stopSessionMonitoring();
    clearAuthData();
    
    // Clear session-specific items
    localStorage.removeItem(STORAGE_KEYS.SESSION_ACTIVE);
    localStorage.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    localStorage.removeItem(STORAGE_KEYS.SESSION_TIMEOUT);
    localStorage.removeItem(STORAGE_KEYS.USER_ACTIVE);
    
    try {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_ACTIVE);
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);
      sessionStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_TIMEOUT);
      sessionStorage.removeItem(STORAGE_KEYS.USER_ACTIVE);
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Handle changes to localStorage from other tabs
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'idToken') {
      if (event.newValue) {
        // Token added in another tab - start monitoring if not already running
        if (!this.activityCheckInterval) {
          this.startSessionMonitoring();
        }
      } else {
        // Token removed in another tab - stop monitoring
        this.stopSessionMonitoring();
      }
    }
  }

  /**
   * Enable or disable auto refresh
   */
  public setAutoRefreshEnabled(enabled: boolean): void {
    this.hasAutoRefreshEnabled = enabled;
  }

  /**
   * Get session status information
   */
  public getSessionStatus(): {
    isActive: boolean;
    lastActivity: number;
    timeUntilTimeout: number;
    isUserActive: boolean;
  } {
    const lastActivity = this.lastActivityTime;
    const timeoutStr = localStorage.getItem(STORAGE_KEYS.SESSION_TIMEOUT);
    const timeout = timeoutStr ? parseInt(timeoutStr) : 0;
    const timeUntilTimeout = timeout > 0 ? timeout - Date.now() : 0;

    return {
      isActive: !!this.activityCheckInterval,
      lastActivity,
      timeUntilTimeout,
      isUserActive: this.isUserActive
    };
  }

  /**
   * Manually extend the session timeout
   */
  public extendSession(): void {
    const timeoutAt = Date.now() + (SESSION_TIMEOUT_MS);
    localStorage.setItem(STORAGE_KEYS.SESSION_TIMEOUT, timeoutAt.toString());
    try {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_TIMEOUT, timeoutAt.toString());
    } catch (e) {}
    this.updateLastActivity();
  }

  /**
   * Clean up event listeners and intervals
   */
  public destroy(): void {
    this.stopSessionMonitoring();
    
    // Remove event listeners
    ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, this.handleUserActivity);
    });
    
    window.removeEventListener('focus', this.handleUserActivity);
    window.removeEventListener('blur', this.handleUserActivity);
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
}

// Create and export a singleton instance
const sessionManager = new SessionManager();
export default sessionManager;
