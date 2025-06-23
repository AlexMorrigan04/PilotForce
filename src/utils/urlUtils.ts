/**
 * URL Utilities for handling OAuth and other URL-related functions
 */

/**
 * Ensure the Cognito domain is properly formatted
 * Important: This handles a specific case where the domain format should have .auth.REGION.amazoncognito.com
 */
export const formatCognitoDomain = (domain: string): string => {
  if (!domain) return '';
  
  // If domain already has https://, extract the domain part
  let domainPart = domain;
  if (domain.startsWith('https://')) {
    domainPart = domain.substring(8);
  }
  
  // If the domain doesn't end with amazoncognito.com, it's already in the correct format
  if (!domainPart.endsWith('.amazoncognito.com')) {
    domainPart = `${domainPart}.auth.eu-north-1.amazoncognito.com`;
  }
  
  // Add https:// back if it was there
  if (domain.startsWith('https://')) {
    return `https://${domainPart}`;
  }
  
  return domainPart;
};

/**
 * Alias for formatCognitoDomain to maintain backward compatibility
 * @deprecated Use formatCognitoDomain instead
 */
export const ensureCorrectCognitoDomain = formatCognitoDomain;

/**
 * Create a properly formatted Google OAuth URL for Cognito
 */
export const createGoogleOAuthUrl = (
  domainInput: string,
  clientId: string,
  redirectUri: string,
  state?: string,
  prompt: string = 'select_account'  // Make select_account the default
): string => {
  // Format the domain correctly
  const domainPart = formatCognitoDomain(domainInput);
  
  // Ensure the domain has https:// prefix
  const domain = domainPart.startsWith('https://') 
    ? domainPart 
    : `https://${domainPart}`;
  
  // Create the URL parameters
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: redirectUri,
    identity_provider: 'Google',
    prompt: prompt,  // Always include prompt parameter
    access_type: 'offline',  // Request refresh token
    include_granted_scopes: 'true'  // Include previously granted scopes
  });
  
  // Add state if provided
  if (state) {
    params.append('state', state);
  }
  
  return `${domain}/oauth2/authorize?${params.toString()}`;
};

/**
 * Alias for createGoogleOAuthUrl to maintain backward compatibility
 * @deprecated Use createGoogleOAuthUrl instead
 */
export const createDirectGoogleOAuthUrl = createGoogleOAuthUrl;

/**
 * Another alias to support legacy code
 * @deprecated Use createGoogleOAuthUrl instead 
 */
export const createCognitoGoogleLoginUrl = createGoogleOAuthUrl;

/**
 * Creates a Microsoft OAuth URL for authentication
 */
export const createMicrosoftOAuthUrl = (
  clientId: string,
  redirectUri: string,
  tenantId: string,
  state?: string,
  prompt: string = 'select_account'  // Make select_account the default
): string => {
  const baseUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email',
    state: state || Math.random().toString(36).substring(7),
    post_logout_redirect_uri: redirectUri,
    prompt: prompt  // Always include prompt parameter
  });

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Log OAuth configuration for debugging
 */
export const logOAuthConfig = (): void => {
};

export default {
  formatCognitoDomain,
  ensureCorrectCognitoDomain,
  createGoogleOAuthUrl,
  createDirectGoogleOAuthUrl,
  createCognitoGoogleLoginUrl,
  createMicrosoftOAuthUrl,
  logOAuthConfig
};
