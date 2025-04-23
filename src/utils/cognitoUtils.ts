import * as crypto from 'crypto-browserify';

/**
 * Get AWS Cognito Client ID from environment or configuration
 */
export const getClientId = (): string => {
  const clientId = process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID;
  if (clientId) {
    return clientId;
  }
  // Don't log the actual client ID in production
  console.warn('Cognito Client ID not found in environment variables');
  return 're4qc69mpbck8uf69jd53oqpa'; // Using the value from .env.production
};

/**
 * Get AWS Cognito Client Secret from environment or configuration
 */
export const getClientSecret = (): string => {
  console.warn('COGNITO_CLIENT_SECRET not found in environment variables');
  return '';  // Return empty string instead of hardcoded secret
};

/**
 * Calculate the secret hash for Cognito
 */
export const calculateSecretHash = (
  username: string, 
  clientId: string, 
  clientSecret: string
): string => {
  try {
    const message = username + clientId;
    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(message);
    return hmac.digest('base64');
  } catch (error) {
    return '';
  }
};

/**
 * Get API Gateway endpoint from environment 
 */
export const getApiEndpoint = (): string => {
  // First check environment variables
  const apiEndpoint = process.env.REACT_APP_API_ENDPOINT;
  
  if (apiEndpoint) {
    return apiEndpoint;
  }
  
  // Fall back to a default - always use the absolute API Gateway URL when deployed
  console.warn('API_ENDPOINT not found in environment variables, using fallback');
  return 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
};

/**
 * Format Cognito attributes properly, ensuring required attributes are presentgf
 * @param attributes - Key-value pairs of attributes
 * @returns Properly formatted attributes for Cognito
 */
export const formatCognitoAttributes = (attributes: Record<string, any>): { Name: string, Value: string }[] => {
  // Create a correctly formatted attributes map
  const formatted: Record<string, string> = {};
  
  // Add all valid attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Handle specific attribute name mappings
      if (key === 'name') {
        formatted['name.formatted'] = String(value);
      } else if (key === 'phone_number') {
        formatted.phoneNumbers = String(value);
      } else {
        formatted[key] = String(value);
      }
    }
  });
  
  // Ensure required attributes are present
  if (!formatted['name.formatted'] && attributes.username) {
    formatted['name.formatted'] = String(attributes.username);
  }
  
  if (!formatted.phoneNumbers) {
    formatted.phoneNumbers = '+15555555555'; // Default placeholder
  }
  
  // Convert to array of {Name, Value} pairs
  return Object.entries(formatted).map(([key, value]) => ({
    Name: key,
    Value: value
  }));
};

export default {
  getClientId,
  getClientSecret,
  calculateSecretHash,
  getApiEndpoint,
  formatCognitoAttributes
};
