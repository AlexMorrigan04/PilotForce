import * as crypto from 'crypto-browserify';

/**
 * Generates a secret hash using HMAC SHA256 for AWS Cognito
 * Note: In production, you should avoid calculating SECRET_HASH on the client side
 * as it requires exposing the client secret. Use a server-side approach instead.
 * 
 * @param username The username/email for Cognito
 * @param clientId The Cognito App client ID
 * @param clientSecret The Cognito App client secret (should be kept private!)
 * @returns The base64-encoded secret hash
 */
export const generateSecretHash = (
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
    console.error('Error generating secret hash:', error);
    return '';
  }
};

/**
 * Safely generates a random value for client-side usage
 * @param length Length of random bytes to generate
 * @returns Hex string of random bytes
 */
export const generateRandomValue = (length: number = 32): string => {
  try {
    return crypto.randomBytes(length).toString('hex');
  } catch (error) {
    console.error('Error generating random value:', error);
    // Fallback using Math.random (less secure but better than nothing)
    return Array.from(
      { length }, 
      () => Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
};

/**
 * Safely generates a random value for client-side usage
 * @param length Length of random bytes to generate
 * @returns Hex string of random bytes
 */
export const generateRandomBytes = (length: number = 16): string => {
  try {
    // Using crypto-browserify's randomBytes
    const randomBytes = crypto.randomBytes(length);
    return randomBytes.toString('hex');
  } catch (error) {
    console.error('Error generating random bytes:', error);
    
    // Fallback for environments where crypto might not be fully available
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length * 2; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
};

export default {
  generateSecretHash,
  generateRandomValue,
  generateRandomBytes
};
