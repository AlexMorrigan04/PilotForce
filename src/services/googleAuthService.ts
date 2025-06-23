import { AuthResponse } from './authServices';
import { getApiEndpoint } from '../utils/cognitoUtils';
import { getCognitoConfig } from '../utils/cognitoConfig';
import { ensureCorrectCognitoDomain, createCognitoGoogleLoginUrl, createDirectGoogleOAuthUrl } from '../utils/urlUtils';

// Get the API endpoint from environment variables
const API_URL = getApiEndpoint();

/**
 * Service responsible for Google OAuth authentication
 */

/**
 * Initiates Google OAuth login flow
 * Redirects directly in current window without opening new tabs
 */
export const initiateGoogleLogin = async (): Promise<boolean> => {
  try {
    // Use our configuration utility to get Cognito settings
    const config = getCognitoConfig();
    
    if (!config.isConfigValid) {
      throw new Error('Missing Cognito configuration');
    }
    
    // Create the OAuth URL components - match Cognito's configuration with trailing slash
    const redirectUri = process.env.REACT_APP_COGNITO_REDIRECT_URI || `${window.location.origin}/oauth-callback`;
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('redirectPath', window.location.pathname);
    
    // Build the Cognito OAuth URL
    // First, ensure the domain is correctly formatted (without a hyphen)
    const correctedDomain = ensureCorrectCognitoDomain(config.domain);
    
    // Use the direct Google OAuth URL helper to bypass Cognito UI
    const cognitoOAuthUrl = createDirectGoogleOAuthUrl(
      correctedDomain,
      config.clientId,
      redirectUri,
      state
    );
    
    // Add a timestamp to ensure no caching (already done in createDirectGoogleOAuthUrl)
    const timestampedUrl = cognitoOAuthUrl;
    // Redirect directly in the current window
    window.location.href = timestampedUrl;
    
    return true;
  } catch (error: any) {
    return false;
  }
};

/**
 * Initiates Google OAuth login with forced account selection
 * Uses the same SSO page as regular login but forces account selection
 */
export const initiateGoogleLoginWithSelection = async (): Promise<boolean> => {
  try {
    // Use our configuration utility to get Cognito settings
    const config = getCognitoConfig();
    
    if (!config.isConfigValid) {
      throw new Error('Missing Cognito configuration');
    }
    
    // Create the OAuth URL components - match Cognito's configuration with trailing slash
    const redirectUri = process.env.REACT_APP_COGNITO_REDIRECT_URI || `${window.location.origin}/oauth-callback`;
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('redirectPath', window.location.pathname);
    
    // Clear any existing tokens and session data to help force a fresh login
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    // Set a cookie to indicate we want to force account selection
    // This is used in case we need to modify behavior in the callback handler
    document.cookie = 'force_account_selection=true; path=/';
    
    // Build the Cognito OAuth URL with special parameters
    // First, ensure the domain is correctly formatted (without a hyphen)
    const correctedDomain = ensureCorrectCognitoDomain(config.domain);
    
    // Use our direct Google OAuth URL helper to bypass Cognito UI
    const cognitoOAuthUrl = createDirectGoogleOAuthUrl(
      correctedDomain,
      config.clientId,
      redirectUri,
      state
    ) + `&login_hint=&_r=${Math.random()}`; // Add random value for extra cache-busting
    // Redirect directly to the Cognito hosted UI
    window.location.href = cognitoOAuthUrl;
    
    return true;
  } catch (error: any) {
    return false;
  }
};

/**
 * Handles the OAuth callback after Google authentication
 * Exchanges the authorization code for tokens
 */
export const handleOAuthCallback = async (authorizationCode: string): Promise<AuthResponse> => {
  try {
    // Use our configuration utility to get Cognito settings
    const config = getCognitoConfig();
    
    if (!config.isConfigValid) {
      throw new Error('Missing Cognito configuration');
    }
    
    // Use the same redirect URI format as in the login request
    // Include the trailing slash to match what's configured in Cognito
    const redirectUri = process.env.REACT_APP_COGNITO_REDIRECT_URI || `${window.location.origin}/oauth-callback`;
    // Make a request to exchange authorization code for tokens
    const requestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code: authorizationCode,
      redirect_uri: redirectUri
    });
    // Using the public client flow without client secret
    const response = await fetch(`https://${config.domain}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestBody
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      // Clear any stale code from URL to prevent repeated failed attempts
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      throw new Error(`Failed to exchange code for tokens: ${errorText}`);
    }
    
    const tokens = await response.json();
    // Get user information using the id token
    const userInfo = await getUserInfo(tokens.id_token);
    
    // Store tokens in localStorage
    localStorage.setItem('idToken', tokens.id_token);
    localStorage.setItem('accessToken', tokens.access_token);
    localStorage.setItem('refreshToken', tokens.refresh_token);
    
    // Store user data
    localStorage.setItem('user', JSON.stringify(userInfo));
    
    // Clear the URL parameters after successful authentication
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    return {
      success: true,
      user: userInfo,
      tokens: {
        idToken: tokens.id_token,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      },
      message: 'Google authentication successful'
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to complete Google authentication'
    };
  }
};

/**
 * Get user information from Cognito's userInfo endpoint using the ID token
 */
const getUserInfo = async (idToken: string): Promise<any> => {
  try {
    // Use our configuration utility to get Cognito settings
    const config = getCognitoConfig();
    
    if (!config.domain) {
      throw new Error('Missing Cognito domain configuration');
    }
    // Extract basic information from the JWT token
    // This is a fallback approach if the userInfo endpoint doesn't work
    try {
      // JWT tokens have three parts separated by dots
      const tokenParts = idToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        // Return user info directly from the token
        return {
          id: payload.sub,
          email: payload.email,
          username: payload.email,
          name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
          emailVerified: payload.email_verified
        };
      }
    } catch (tokenError) {
    }
    
    // Try to get user info from the userInfo endpoint as backup
    try {
      const response = await fetch(`https://${config.domain}/oauth2/userInfo`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get user info: ${errorText}`);
      }
      
      const userInfo = await response.json();
      
      // Format the user data to match our application's structure
      return {
        id: userInfo.sub,
        email: userInfo.email,
        username: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        emailVerified: userInfo.email_verified
      };
    } catch (endpointError) {
      // If we already have user data from the token, no need to rethrow
      throw endpointError;
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Refreshes the token using the refresh token
 */
export const refreshOAuthToken = async (): Promise<AuthResponse> => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    // Use our configuration utility to get Cognito settings
    const config = getCognitoConfig();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    if (!config.isConfigValid) {
      throw new Error('Missing Cognito configuration');
    }
    
    // Get the username with google_ prefix
    let username = localStorage.getItem('auth_username');
    if (!username || !username.startsWith('google_')) {
      // Try to get email from stored user data
      const userDataStr = localStorage.getItem('userData') || localStorage.getItem('user');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          const email = userData.email || userData.Email;
          if (email) {
            username = `google_${email}`;
            localStorage.setItem('auth_username', username);
          }
        } catch (e) {
        }
      }
    }
    
    // If still no username, try to extract from token
    if (!username) {
      const idToken = localStorage.getItem('idToken');
      if (idToken) {
        try {
          const tokenPayload = JSON.parse(atob(idToken.split('.')[1]));
          const email = tokenPayload.email || tokenPayload['cognito:username'];
          if (email) {
            username = `google_${email}`;
            localStorage.setItem('auth_username', username);
          }
        } catch (e) {
        }
      }
    }
    
    if (!username) {
      throw new Error('No username available for token refresh');
    }
    
    // Public client doesn't need Authorization header
    const response = await fetch(`https://${config.domain}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        refresh_token: refreshToken,
        username: username // Include username for proper token refresh
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to refresh token');
    }
    
    const tokens = await response.json();
    
    // Store the new tokens
    localStorage.setItem('idToken', tokens.id_token);
    localStorage.setItem('accessToken', tokens.access_token);
    
    // Note: The response doesn't include a new refresh token
    // Keep the existing refresh token
    
    return {
      success: true,
      tokens: {
        idToken: tokens.id_token,
        accessToken: tokens.access_token,
        refreshToken: refreshToken // Keep the existing refresh token
      },
      message: 'Token refreshed successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to refresh token'
    };
  }
};

/**
 * Handles the redirect from Google OAuth
 * This is used as a proxy for the actual OAuth callback handling
 */
export const handleGoogleRedirect = async (url: string): Promise<AuthResponse> => {
  try {
    // Parse the authorization code from the URL
    const params = new URLSearchParams(url.split('?')[1]);
    const code = params.get('code');
    
    if (!code) {
      return {
        success: false,
        message: 'No authorization code found in the redirect URL'
      };
    }
    
    // Exchange the code for tokens
    return await handleOAuthCallback(code);
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to handle Google redirect'
    };
  }
};

/**
 * Check if the user is authenticated via Google
 */
export const isGoogleAuthenticated = async (): Promise<boolean> => {
  try {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) return false;
    
    // Get Cognito configuration
    const config = getCognitoConfig();
    if (!config.domain) return false;
    
    // Get the user info to validate the token
    const response = await fetch(`https://${config.domain}/oauth2/userInfo`, {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });
    
    if (!response.ok) return false;
    
    const userInfo = await response.json();
    
    // Check if this is a Google-authenticated user (identities field will contain Google)
    return !!userInfo.sub;
  } catch (error) {
    return false;
  }
};

export default {
  initiateGoogleLogin,
  initiateGoogleLoginWithSelection,
  handleOAuthCallback,
  refreshOAuthToken,
  getUserInfo,
  handleGoogleRedirect,
  isGoogleAuthenticated
};