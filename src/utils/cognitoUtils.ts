import * as crypto from 'crypto-browserify';

/**
 * Get AWS Cognito Client ID from environment or configuration
 */
export const getClientId = (): string => {
  // First check environment variables
  const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
  
  if (clientId) {
    return clientId;
  }
  
  // Fall back to a default for development (should be configured in .env)
  console.warn('COGNITO_CLIENT_ID not found in environment variables, using fallback');
  return '2vekd3c5hcmknfvb9e00vg35p'; // Replace with your actual client ID
};

/**
 * Get AWS Cognito Client Secret from environment or configuration
 */
export const getClientSecret = (): string => {
  // First check environment variables
  const clientSecret = process.env.REACT_APP_COGNITO_CLIENT_SECRET;
  
  if (clientSecret) {
    return clientSecret;
  }
  
  // Fall back to a default for development (should be configured in .env)
  console.warn('COGNITO_CLIENT_SECRET not found in environment variables, using fallback');
  
  // SECURITY CONCERN: Hardcoded client secret in frontend code
  return '1v4i0p2ifrp7jk46ufbp02p8ej5u2vn3o8t6lqvjjfkqkubp8go5';
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
    console.error('Error calculating secret hash:', error);
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
  
  // Fall back to a default
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
