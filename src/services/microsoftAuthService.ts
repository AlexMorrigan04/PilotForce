import { createMicrosoftOAuthUrl } from '../utils/urlUtils';

// Hardcoded Microsoft OAuth configuration
const MICROSOFT_CONFIG = {
  clientId: process.env.REACT_APP_MICROSOFT_CLIENT_ID || '',
  tenantId: 'common',  // Force to 'common' for multi-tenant applications
  redirectUri: `${process.env.REACT_APP_BASE_URL || window.location.origin}/auth/microsoft/callback`
};

/**
 * Initiates Microsoft OAuth login flow
 * @returns {Promise<boolean>} True if redirect successful, false otherwise
 */
export const initiateMicrosoftLogin = async (): Promise<boolean> => {
  try {
    const clientId = MICROSOFT_CONFIG.clientId;
    const redirectUri = MICROSOFT_CONFIG.redirectUri;
    const tenantId = MICROSOFT_CONFIG.tenantId;

    // Log all configuration values (without exposing sensitive data)
    // Generate state parameter for security
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('msAuthState', state);

    // Create Microsoft OAuth URL
    const url = createMicrosoftOAuthUrl(
      clientId,
      redirectUri,
      tenantId,
      state
    );


    // Redirect to Microsoft login
    window.location.href = url;
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Initiates Microsoft OAuth login flow with account selection
 * @returns {Promise<boolean>} True if redirect successful, false otherwise
 */
export const initiateMicrosoftLoginWithSelection = async (): Promise<boolean> => {
  try {
    const clientId = MICROSOFT_CONFIG.clientId;
    const redirectUri = MICROSOFT_CONFIG.redirectUri;
    const tenantId = MICROSOFT_CONFIG.tenantId;

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('msAuthState', state);

    // Create Microsoft OAuth URL with prompt=select_account
    const url = createMicrosoftOAuthUrl(
      clientId,
      redirectUri,
      tenantId,
      state,
      'select_account'
    );

    // Redirect to Microsoft login
    window.location.href = url;
    return true;
  } catch (error) {
    return false;
  }
}; 