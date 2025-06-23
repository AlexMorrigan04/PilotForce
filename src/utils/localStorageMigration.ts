/**
 * LocalStorage Migration Utility
 * Helps migrate sensitive data from localStorage to secureStorage
 */

import secureStorage from './secureStorage';
import secureLogger from './secureLogger';

// Define sensitive keys that should be migrated to secureStorage
const SENSITIVE_KEYS = [
  'idToken',
  'accessToken', 
  'refreshToken',
  'auth_username',
  'token_username',
  'cognito_username',
  'userData',
  'user',
  'tokens',
  'pendingConfirmation',
  'auth_email',
  'pendingEmail',
  'isAdmin',
  'adminAuthCompleted',
  'adminLoginTimestamp',
  'pilotforceSessionActive',
  'pilotforceSessionTimestamp',
  'selectedBookingId',
  'isFlightDetailsLoading'
];

// Define non-sensitive keys that can stay in localStorage
const NON_SENSITIVE_KEYS = [
  'userRole',
  'companyName',
  'companyId',
  'navigating_to_booking',
  'navigating_to_assets',
  'reloadAssetsPage',
  'makeBookings_loaded',
  'sessionActive',
  'pendingInviteCode'
];

/**
 * Migrate sensitive data from localStorage to secureStorage
 */
export const migrateSensitiveData = async (): Promise<void> => {
  try {
    secureLogger.info('Starting localStorage to secureStorage migration');
    
    for (const key of SENSITIVE_KEYS) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          // Store in secureStorage
          await secureStorage.secureSet(key, value);
          
          // Remove from localStorage
          localStorage.removeItem(key);
          
          secureLogger.info(`Migrated key: ${key}`);
        } catch (error) {
          secureLogger.error(`Failed to migrate key ${key}:`, error);
        }
      }
    }
    
    secureLogger.info('LocalStorage migration completed');
  } catch (error) {
    secureLogger.error('Error during localStorage migration:', error);
  }
};

/**
 * Get a value from secureStorage with localStorage fallback
 */
export const getSecureValue = async (key: string): Promise<string | null> => {
  try {
    // Try secureStorage first
    const secureValue = await secureStorage.secureGet(key);
    if (secureValue !== null) {
      return secureValue;
    }
    
    // Fallback to localStorage for non-sensitive keys
    if (NON_SENSITIVE_KEYS.includes(key)) {
      return localStorage.getItem(key);
    }
    
    return null;
  } catch (error) {
    secureLogger.error(`Error getting secure value for key ${key}:`, error);
    return null;
  }
};

/**
 * Set a value in secureStorage or localStorage based on sensitivity
 */
export const setSecureValue = async (key: string, value: string): Promise<void> => {
  try {
    if (SENSITIVE_KEYS.includes(key)) {
      await secureStorage.secureSet(key, value);
    } else {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    secureLogger.error(`Error setting secure value for key ${key}:`, error);
  }
};

/**
 * Remove a value from both secureStorage and localStorage
 */
export const removeSecureValue = async (key: string): Promise<void> => {
  try {
    await secureStorage.secureRemove(key);
    localStorage.removeItem(key);
  } catch (error) {
    secureLogger.error(`Error removing secure value for key ${key}:`, error);
  }
};

/**
 * Clear all sensitive data from both storages
 */
export const clearAllSecureData = async (): Promise<void> => {
  try {
    // Clear secureStorage
    secureStorage.secureClear();
    
    // Clear sensitive keys from localStorage
    for (const key of SENSITIVE_KEYS) {
      localStorage.removeItem(key);
    }
    
    secureLogger.info('All secure data cleared');
  } catch (error) {
    secureLogger.error('Error clearing secure data:', error);
  }
};

export default {
  migrateSensitiveData,
  getSecureValue,
  setSecureValue,
  removeSecureValue,
  clearAllSecureData,
  SENSITIVE_KEYS,
  NON_SENSITIVE_KEYS
}; 