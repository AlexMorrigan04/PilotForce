/**
 * Session Manager - Handles auth session persistence across browser refreshes
 * 
 * This utility manages authentication tokens in localStorage and sessionStorage,
 * implements a heartbeat to keep session alive, and provides methods for
 * storing, retrieving, and refreshing tokens.
 */

import { shouldRefreshToken } from './tokenDebugger';
import { refreshToken as refreshAuthToken } from '../services/authServices';
import { 
  storeAuthTokens, 
  getAuthToken, 
  getRefreshToken as getStoredRefreshToken, 
  initializeSession 
} from './sessionPersistence';

// Configurable constants
const AUTH_HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000; // 4 minute heartbeat
const TOKEN_REFRESH_THRESHOLD_MINUTES = 10; // Refresh tokens 10 minutes before expiry
const SESSION_PERSISTENCE_KEY = 'pilotforce_session_active';
const SESSION_TIMESTAMP_KEY = 'pilotforce_session_timestamp';

/**
 * SessionManager class - Handles auth session management
 */
export class SessionManager {
  private heartbeatInterval: number | null = null;
  private refreshTokenCallback: (() => Promise<boolean>) | null = null;
  private hasAutoRefreshEnabled: boolean = true;

  /**
   * Initialize the session manager with refresh token capability
   * @param refreshCallback Optional callback that will refresh the token
   */
  constructor(refreshCallback?: () => Promise<boolean>) {
    if (refreshCallback) {
      this.refreshTokenCallback = refreshCallback;
    } else {
      // Default refresh implementation
      this.refreshTokenCallback = this.defaultRefreshToken.bind(this);
    }
    this.initSessionTracking();
  }

  /**
   * Start the heartbeat to keep the session alive
   * and check token expiration regularly
   */
  public startHeartbeat(): void {
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
    }

    // Set a timestamp to track when the session was last active
    this.updateSessionTimestamp();

    this.heartbeatInterval = window.setInterval(() => {
      this.checkTokenHealth();
      this.updateSessionTimestamp();
    }, AUTH_HEARTBEAT_INTERVAL_MS);

    // Also check token health immediately
    this.checkTokenHealth();

  }

  /**
   * Stop the session heartbeat
   */
  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Default token refresh implementation that uses the authServices refresh logic
   */
  private async defaultRefreshToken(): Promise<boolean> {
    try {
      const result = await refreshAuthToken();
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Store authentication tokens in both localStorage and sessionStorage
   * for better persistence across tabs and refreshes
   * 
   * @param tokens Object containing idToken, accessToken, and refreshToken
   */
  public storeTokens(tokens: {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    [key: string]: any;
  }): void {
    try {
      // Use the enhanced storeAuthTokens utility
      storeAuthTokens(
        tokens.idToken || null,
        tokens.refreshToken || null,
        tokens.accessToken || null
      );

      // Store entire tokens object as JSON if it contains additional data
      if (Object.keys(tokens).length > 0) {
        const tokensStr = JSON.stringify(tokens);
        localStorage.setItem('tokens', tokensStr);
        try { sessionStorage.setItem('tokens', tokensStr); } catch (e) {}
      }

      // Mark session as active
      localStorage.setItem(SESSION_PERSISTENCE_KEY, 'true');
      try { sessionStorage.setItem(SESSION_PERSISTENCE_KEY, 'true'); } catch (e) {}

      this.updateSessionTimestamp();
      this.startHeartbeat();
    } catch (error) {
    }
  }

  /**
   * Store user data in both localStorage and sessionStorage
   * @param user User data object
   */
  public storeUserData(user: any): void {
    if (!user) return;

    try {
      // Use the enhanced storeAuthTokens utility to also store user data
      storeAuthTokens(null, null, null, user);
    } catch (error) {
    }
  }

  /**
   * Retrieve the ID token from storage
   * @returns ID token or null if not found
   */
  public getIdToken(): string | null {
    return getAuthToken();
  }

  /**
   * Retrieve the access token from storage
   * @returns Access token or null if not found
   */
  public getAccessToken(): string | null {
    return localStorage.getItem('accessToken') || 
           (this.isSessionStorageAvailable() ? sessionStorage.getItem('accessToken') : null);
  }

  /**
   * Retrieve the refresh token from storage
   * @returns Refresh token or null if not found
   */
  public getRefreshToken(): string | null {
    return getStoredRefreshToken();
  }

  /**
   * Get all stored tokens
   * @returns Object containing all available tokens
   */
  public getAllTokens(): {
    idToken: string | null;
    accessToken: string | null;
    refreshToken: string | null;
  } {
    return {
      idToken: this.getIdToken(),
      accessToken: this.getAccessToken(),
      refreshToken: this.getRefreshToken()
    };
  }

  /**
   * Retrieve stored user data
   * @returns User data object or null if not found
   */
  public getUserData(): any {
    try {
      const userStr = localStorage.getItem('user') || 
                     (this.isSessionStorageAvailable() ? sessionStorage.getItem('user') : null);
      
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (error) {
    }
    return null;
  }

  /**
   * Clear all authentication data
   */
  public clearSession(): void {
    this.stopHeartbeat();
    
    // Clear localStorage
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
    localStorage.removeItem(SESSION_PERSISTENCE_KEY);
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
    
    // Clear sessionStorage if available
    if (this.isSessionStorageAvailable()) {
      sessionStorage.removeItem('idToken');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('tokens');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem(SESSION_PERSISTENCE_KEY);
      sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
    }
  }

  /**
   * Check if a user is logged in based on stored tokens
   * @returns True if logged in, false otherwise
   */
  public isLoggedIn(): boolean {
    const idToken = this.getIdToken();
    return !!idToken;
  }

  /**
   * Update the session timestamp to mark activity
   */
  private updateSessionTimestamp(): void {
    const now = new Date().getTime().toString();
    localStorage.setItem(SESSION_TIMESTAMP_KEY, now);
    try { sessionStorage.setItem(SESSION_TIMESTAMP_KEY, now); } catch (e) {}
  }

  /**
   * Check if refresh token functionality is available
   */
  private canRefreshToken(): boolean {
    return !!this.refreshTokenCallback && !!this.getRefreshToken();
  }

  /**
   * Initialize session tracking when creating the session manager
   */
  private initSessionTracking(): void {
    // Initialize session from stored data
    const { isAuthenticated, token } = initializeSession();
    
    if (isAuthenticated && token) {
      this.startHeartbeat();
    } else if (token) {
      // We have a token but it might be expired, try to refresh it
      this.checkTokenHealth();
    }

    // Listen for storage events to synchronize between tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  /**
   * Handle changes to localStorage from other tabs
   */
  private handleStorageChange(event: StorageEvent): void {
    // Synchronize session state between tabs
    if (event.key === 'idToken') {
      if (event.newValue) {
        // Token added in another tab - start heartbeat if not already running
        if (!this.heartbeatInterval) {
          this.startHeartbeat();
        }
      } else {
        // Token removed in another tab - stop heartbeat
        this.stopHeartbeat();
      }
    }
  }

  /**
   * Check token health and refresh if needed
   */
  private async checkTokenHealth(): Promise<void> {
    const idToken = this.getIdToken();
    
    if (!this.hasAutoRefreshEnabled) return;
    
    if (idToken && shouldRefreshToken(idToken, TOKEN_REFRESH_THRESHOLD_MINUTES)) {
      
      if (this.canRefreshToken()) {
        try {
          const success = await this.refreshTokenCallback!();
          if (success) {
          } else {
            console.warn('Token refresh failed');
          }
        } catch (error) {
        }
      } else {
        console.warn('Token needs refreshing but no refresh callback is available');
      }
    }
  }

  /**
   * Check if sessionStorage is available
   */
  private isSessionStorageAvailable(): boolean {
    try {
      const test = 'test';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Manually refresh the auth token
   * @returns Promise that resolves to true if refresh was successful
   */
  public async forceTokenRefresh(): Promise<boolean> {
    if (this.canRefreshToken()) {
      try {
        const success = await this.refreshTokenCallback!();
        return success;
      } catch (error) {
        return false;
      }
    }
    return false;
  }
  
  /**
   * Enable or disable automatic token refreshing
   */
  public setAutoRefresh(enabled: boolean): void {
    this.hasAutoRefreshEnabled = enabled;
  }
}

// Create singleton instance with default refresh implementation
export const sessionManager = new SessionManager();

export default sessionManager;
