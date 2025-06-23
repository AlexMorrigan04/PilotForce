import AWS from 'aws-sdk';
import { getTokens } from './localStorage';

/**
 * Configures the AWS SDK with default credentials to avoid errors
 * NOTE: We don't use the AWS SDK directly anymore - use REST APIs instead!
 * @returns Boolean indicating if the configuration was successful
 */
export const configureAWSSDK = (): boolean => { // Renamed from configureAWS to configureAWSSDK
  try {
    const region = process.env.REACT_APP_AWS_REGION;
    const accessKeyId = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;
    
    // Log safely without exposing actual values
    
    if (region && accessKeyId && secretAccessKey) {
      AWS.config.update({
        region,
        accessKeyId,
        secretAccessKey
      });
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

// Add configureAWS as an alias for backward compatibility
export const configureAWS = configureAWSSDK;

/**
 * Test AWS credentials by making a simple S3 request
 */
export const testAwsCredentials = async (): Promise<boolean> => {
  try {
    const s3 = new AWS.S3();
    await s3.listBuckets().promise();
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get AWS credentials status
 */
export const getAwsCredentialsStatus = (): {
  hasRegion: boolean;
  hasAccessKey: boolean;
  hasSecretKey: boolean;
  isConfigured: boolean;
} => {
  const region = process.env.REACT_APP_AWS_REGION;
  const accessKeyId = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;
  
  return {
    hasRegion: !!region,
    hasAccessKey: !!accessKeyId,
    hasSecretKey: !!secretAccessKey,
    isConfigured: !!(region && accessKeyId && secretAccessKey)
  };
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
  }
  return {};
};

// Call the configure function immediately 
configureAWSSDK();

export default {
  configureAWS,
  configureAWSSDK,
  testAwsCredentials,
  getAwsCredentialsStatus,
  getAuthHeader
};
