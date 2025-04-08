import AWS from 'aws-sdk';
import { getTokens } from './localStorage';

/**
 * Configures the AWS SDK with default credentials to avoid errors
 * NOTE: We don't use the AWS SDK directly anymore - use REST APIs instead!
 * @returns Boolean indicating if the configuration was successful
 */
export const configureAWSSDK = (): boolean => {
  try {
    // Load AWS config from localStorage
    const awsConfig = JSON.parse(localStorage.getItem('awsConfig') || '{}');
    
    // Configure AWS SDK with basic settings
    AWS.config.region = awsConfig.region || 'eu-north-1';
    
    // Use dummy credentials to prevent SDK errors - IMPORTANT: These won't actually work!
    AWS.config.credentials = new AWS.Credentials({
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE', 
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
    });
    
    console.log('AWS SDK configured with default region:', AWS.config.region);
    console.log('⚠️ WARNING: Using dummy credentials - do not use AWS SDK directly!');
    console.log('✅ Use the REST API endpoints with auth tokens or username/password instead.');
    
    return true;
  } catch (error) {
    console.error('Error configuring AWS SDK:', error);
    return false;
  }
};

/**
 * Gets the authorization header with the ID token from localStorage
 * @returns Object with Authorization header or empty object if no token
 */
export const getAuthHeader = (): Record<string, string> => {
  try {
    const tokens = getTokens();
    if (tokens?.idToken) {
      return {
        'Authorization': `Bearer ${tokens.idToken}`
      };
    }
  } catch (error) {
    console.error('Error getting auth header:', error);
  }
  return {};
};

// Call the configure function immediately 
configureAWSSDK();

export default {
  configureAWSSDK,
  getAuthHeader
};
