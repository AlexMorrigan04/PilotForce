/**
 * Authentication Utilities
 * 
 * A collection of helper functions for handling authentication tokens,
 * session management, and URL generation for OAuth flows.
 */

// Get API URL from environment or default
export const getApiUrl = (): string => {
  return process.env.REACT_APP_API_URL || process.env.REACT_APP_API_ENDPOINT || '';
};

/**
 * Get the current authentication token from storage
 */
export const getAuthToken = (): string | null => {
  // Try multiple token storage locations, prioritizing access token
  const token = localStorage.getItem('accessToken') || 
                localStorage.getItem('cognitoAccessToken') ||
                localStorage.getItem('idToken') || 
                localStorage.getItem('cognitoIdToken') ||
                localStorage.getItem('authToken') ||
                sessionStorage.getItem('accessToken') ||
                sessionStorage.getItem('idToken') ||
                null;
  
  if (!token) return null;
  
  try {
    // Parse and validate token
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const { exp, 'custom:role': role, 'custom:CompanyId': upperCompanyId, 'custom:companyId': lowerCompanyId } = JSON.parse(jsonPayload);
    const companyId = upperCompanyId || lowerCompanyId;

    // Store company ID in localStorage if it exists in token
    if (companyId) {
      localStorage.setItem('companyId', companyId);
      localStorage.setItem('selectedCompanyId', companyId);
    }

    // Check if token is expired
    if (exp && Date.now() >= exp * 1000) {
      // Clear expired token
      if (localStorage.getItem('accessToken') === token) {
        localStorage.removeItem('accessToken');
      }
      if (localStorage.getItem('cognitoAccessToken') === token) {
        localStorage.removeItem('cognitoAccessToken');
      }
      return null;
    }

    return token;
  } catch (error) {
    return null;
  }
};

/**
 * Check if the user has a valid authentication token
 */
export const hasValidToken = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    // Extract the expiration time from the token
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const { exp } = JSON.parse(jsonPayload);
    
    // Check if the token is expired
    return exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
};

/**
 * Determine if the user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return hasValidToken();
};

/**
 * Check if the user is an admin user
 */
export const isAdminUser = (): boolean => {
  if (!isAuthenticated()) return false;
  
  // Check for admin flag in localStorage
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  
  if (isAdmin) return true;
  
  // Check for admin role in token
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const { 'custom:role': role } = JSON.parse(jsonPayload);
    
    return role === 'Administrator' || role === 'Admin' || role === 'CompanyAdmin';
  } catch (e) {
    return false;
  }
};

/**
 * Clear all authentication data from localStorage and sessionStorage
 */
export const clearAuthData = (): void => {
  // Clear tokens
  localStorage.removeItem('idToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokensObject');
  localStorage.removeItem('userCognitoDetails');
  
  // Clear session flags
  localStorage.removeItem('pilotforceSessionActive');
  localStorage.removeItem('pilotforceSessionTimestamp');
  localStorage.removeItem('isAdmin');
  
  // Clear from sessionStorage too
  sessionStorage.removeItem('idToken');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('tokensObject');
  sessionStorage.removeItem('userCognitoDetails');
};

/**
 * Ensure the Cognito domain is properly formatted
 * Important fix: Removes hyphen between region and pool ID
 */
export const ensureCorrectCognitoDomain = (domain: string): string => {
  if (!domain) return '';
  
  // If domain already has https://, extract the domain part
  let domainPart = domain;
  if (domain.startsWith('https://')) {
    domainPart = domain.substring(8);
  }
  
  // Fix the common issue with hyphen between region and pool ID
  // This is a fix for "eu-north-1-tzpyllcx2" to become "eu-north-1tzpyllcx2"
  const regionPattern = /^(eu-north-1)-(tzpyllcx2)/;
  domainPart = domainPart.replace(regionPattern, '$1$2');
  
  // Add https:// prefix
  if (!domain.startsWith('https://')) {
    return `https://${domainPart}`;
  }
  
  return `https://${domainPart}`;
};

/**
 * Create a direct Google OAuth URL for the Cognito hosted UI
 * @param domain Cognito domain
 * @param clientId The client ID
 * @param redirectUri The redirect URI after authentication
 * @param state Optional state parameter for OAuth flow
 * @returns Fully constructed Google OAuth URL
 */
export const createDirectGoogleOAuthUrl = (
  domain: string,
  clientId: string,
  redirectUri: string,
  state?: string
): string => {
  const baseUrl = ensureCorrectCognitoDomain(domain);
  
  // Construct the OAuth URL with required parameters
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: redirectUri,
    identity_provider: 'Google'
  });
  
  // Add state if provided
  if (state) {
    params.append('state', state);
  }
  
  return `${baseUrl}/oauth2/authorize?${params.toString()}`;
};

/**
 * Check if the current user is authenticated via Google SSO
 * @returns boolean True if user authenticated via Google SSO
 */
export const isGoogleSSOUser = (): boolean => {
  // Google SSO users have a username that starts with 'google_'
  const username = localStorage.getItem('auth_username') || 
                   localStorage.getItem('cognito_username') ||
                   localStorage.getItem('token_username');
  
  return !!username && username.startsWith('google_');
};

export default {
  getApiUrl,
  getAuthToken,
  hasValidToken,
  isAuthenticated,
  isAdminUser,
  clearAuthData,
  ensureCorrectCognitoDomain,
  createDirectGoogleOAuthUrl,
  isGoogleSSOUser
};