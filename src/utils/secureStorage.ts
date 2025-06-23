/**
 * Secure Storage Utility
 * Provides encrypted storage functionality for sensitive data
 */

import CryptoJS from 'crypto-js';
import { generateRandomString } from './securityValidator';

// Storage keys
const ID_TOKEN_KEY = 'id_token';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';
const ENCRYPTION_KEY = 'encryption_key';

// Get or generate a stable encryption key
const getEncryptionKey = (): string => {
  let key = sessionStorage.getItem(ENCRYPTION_KEY);
  
  if (!key) {
    // Generate a new key if none exists
    key = generateRandomString(32);
    try {
      // Store in sessionStorage so it's cleared when the browser is closed
      sessionStorage.setItem(ENCRYPTION_KEY, key);
    } catch (error) {
      // Fallback in case sessionStorage is unavailable
    }
  }
  
  return key;
};

/**
 * Encrypt a string value securely
 * @param value Value to encrypt
 * @returns Encrypted string
 */
const encrypt = (value: string): string => {
  try {
    const key = getEncryptionKey();
    return CryptoJS.AES.encrypt(value, key).toString();
  } catch (error) {
    // Silent error and return original value if encryption fails
    return value;
  }
};

/**
 * Decrypt an encrypted string
 * @param encryptedValue Encrypted string
 * @returns Decrypted value
 */
const decrypt = (encryptedValue: string): string => {
  try {
    const key = getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(encryptedValue, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    // Silent error and return original value if decryption fails
    return encryptedValue;
  }
};

/**
 * Store a value securely
 * @param key Storage key
 * @param value Value to store
 */
export async function secureSet(key: string, value: string): Promise<void> {
  try {
    const encryptedValue = encrypt(value);
    sessionStorage.setItem(key, encryptedValue);
  } catch (error) {
    // Use a secure logger instead of console
    // secureLogger.error('Error storing data securely:', error);
  }
}

/**
 * Get a value from secure storage
 * @param key Storage key
 * @returns Stored value or null if not found
 */
export async function secureGet(key: string): Promise<string | null> {
  try {
    const encryptedValue = sessionStorage.getItem(key);
    if (encryptedValue) {
      return decrypt(encryptedValue);
    }
    return null;
  } catch (error) {
    // Use a secure logger instead of console
    // secureLogger.error('Error retrieving data from secure storage:', error);
    return null;
  }
}

/**
 * Remove a value from secure storage
 * @param key Storage key
 */
export function secureRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    // Use a secure logger instead of console
    // secureLogger.error('Error removing data from secure storage:', error);
  }
}

/**
 * Clear all values from secure storage
 */
export function secureClear(): void {
  try {
    // Only clear our keys, not all of sessionStorage
    secureRemove(ID_TOKEN_KEY);
    secureRemove(ACCESS_TOKEN_KEY);
    secureRemove(REFRESH_TOKEN_KEY);
    secureRemove(USER_DATA_KEY);
  } catch (error) {
    // Use a secure logger instead of console
    // secureLogger.error('Error clearing secure storage:', error);
  }
}

/**
 * Store authentication tokens
 * @param idToken ID token
 * @param accessToken Access token
 * @param refreshToken Refresh token
 */
export function storeAuthTokens(
  idToken: string,
  accessToken: string,
  refreshToken: string
): void {
  secureSet(ID_TOKEN_KEY, idToken);
  secureSet(ACCESS_TOKEN_KEY, accessToken);
  secureSet(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Get authentication tokens
 * @returns Object containing auth tokens
 */
export function getAuthTokens(): { 
  idToken: string | null; 
  accessToken: string | null; 
  refreshToken: string | null; 
} {
  return {
    idToken: sessionStorage.getItem(ID_TOKEN_KEY) ? decrypt(sessionStorage.getItem(ID_TOKEN_KEY)!) : null,
    accessToken: sessionStorage.getItem(ACCESS_TOKEN_KEY) ? decrypt(sessionStorage.getItem(ACCESS_TOKEN_KEY)!) : null,
    refreshToken: sessionStorage.getItem(REFRESH_TOKEN_KEY) ? decrypt(sessionStorage.getItem(REFRESH_TOKEN_KEY)!) : null
  };
}

/**
 * Clear authentication tokens
 */
export function clearAuthTokens(): void {
  secureRemove(ID_TOKEN_KEY);
  secureRemove(ACCESS_TOKEN_KEY);
  secureRemove(REFRESH_TOKEN_KEY);
}

/**
 * Store user data
 * @param userData User data object
 */
export function storeUserData(userData: any): void {
  try {
    secureSet(USER_DATA_KEY, JSON.stringify(userData));
  } catch (error) {
    // Use a secure logger instead of console
    // secureLogger.error('Error storing user data:', error);
  }
}

/**
 * Get user data
 * @returns User data object or null if not found
 */
export function getUserData(): any | null {
  try {
    const data = sessionStorage.getItem(USER_DATA_KEY);
    if (!data) return null;
    
    const decryptedData = decrypt(data);
    return decryptedData ? JSON.parse(decryptedData) : null;
  } catch (error) {
    // Use a secure logger instead of console
    // secureLogger.error('Error retrieving user data:', error);
    return null;
  }
}

export default {
  secureSet,
  secureGet,
  secureRemove,
  secureClear,
  storeAuthTokens,
  getAuthTokens,
  clearAuthTokens,
  storeUserData,
  getUserData
};
