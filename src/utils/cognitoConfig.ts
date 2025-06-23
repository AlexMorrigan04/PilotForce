/**
 * This file provides consistent access to Cognito configuration values
 * It includes fallbacks and debug information to help troubleshoot configuration issues
 */

interface CognitoConfig {
  region: string;
  userPoolId: string;
  clientId: string;
  domain: string;
  isConfigValid: boolean;
}

/**
 * Returns Cognito configuration with validation and debug information
 */
export const getCognitoConfig = (): CognitoConfig => {
  // Get values from environment or use consistent fallbacks
  const region = process.env.REACT_APP_AWS_REGION || '';
  const userPoolId = process.env.REACT_APP_USER_POOL_ID || '';
  const clientId = process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || ''; // Use the client ID with secret
  const domain = process.env.REACT_APP_COGNITO_DOMAIN || '';
  
  // Debug detailed Cognito configuration
  const isConfigValid = !!(region && userPoolId && clientId && domain);
  
  return {
    region,
    userPoolId,
    clientId,
    domain,
    isConfigValid
  };
};