/**
 * Secure Storage Utility
 * Provides a more secure alternative to localStorage/sessionStorage with encryption
 */

// Use a more secure encryption library in production
// This is a simplified example
function encrypt(text: string, secretKey: string): string {
  // In a real application, use a proper encryption library
  // This is just a placeholder implementation
  try {
    // Simple XOR encryption (NOT for production use)
    const textBytes = new TextEncoder().encode(text);
    const keyBytes = new TextEncoder().encode(secretKey);
    const result = new Uint8Array(textBytes.length);
    
    for (let i = 0; i < textBytes.length; i++) {
      result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    // Fallback if encryption fails
    return btoa(text);
  }
}

function decrypt(encryptedText: string, secretKey: string): string {
  // In a real application, use a proper decryption library
  // This is just a placeholder implementation
  try {
    // Simple XOR decryption (NOT for production use)
    const encryptedBytes = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    const keyBytes = new TextEncoder().encode(secretKey);
    const result = new Uint8Array(encryptedBytes.length);
    
    for (let i = 0; i < encryptedBytes.length; i++) {
      result[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(result);
  } catch (error) {
    // Fallback if decryption fails
    return atob(encryptedText);
  }
}

// Generate a device fingerprint to use as part of encryption key
function getDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset()
  ];
  
  return components.join('|');
}

// Get a secret key based on app name and device fingerprint
function getSecretKey(): string {
  const appName = process.env.REACT_APP_NAME || 'PilotForce';
  const fingerprint = getDeviceFingerprint();
  return `${appName}-${fingerprint}`;
}

// Secure storage interface
export const secureStorage = {
  // Set item with encryption
  setItem: (key: string, value: string): void => {
    try {
      const secretKey = getSecretKey();
      const encryptedValue = encrypt(value, secretKey);
      
      // Store in sessionStorage by default for better security
      sessionStorage.setItem(key, encryptedValue);
    } catch (error) {
      // Fallback to direct storage if encryption fails
      sessionStorage.setItem(key, value);
    }
  },
  
  // Get item with decryption
  getItem: (key: string): string | null => {
    try {
      const encryptedValue = sessionStorage.getItem(key);
      if (!encryptedValue) return null;
      
      const secretKey = getSecretKey();
      return decrypt(encryptedValue, secretKey);
    } catch (error) {
      // Fallback to direct retrieval if decryption fails
      return sessionStorage.getItem(key);
    }
  },
  
  // Remove item
  removeItem: (key: string): void => {
    sessionStorage.removeItem(key);
  },
  
  // Clear all items
  clear: (): void => {
    sessionStorage.clear();
  },
  
  // Set item with persistence (uses localStorage but encrypted)
  setPersistentItem: (key: string, value: string): void => {
    try {
      const secretKey = getSecretKey();
      const encryptedValue = encrypt(value, secretKey);
      
      // Store in localStorage for persistence, but encrypted
      localStorage.setItem(key, encryptedValue);
    } catch (error) {
      // Fallback to direct storage if encryption fails
      localStorage.setItem(key, value);
    }
  },
  
  // Get persistent item with decryption
  getPersistentItem: (key: string): string | null => {
    try {
      const encryptedValue = localStorage.getItem(key);
      if (!encryptedValue) return null;
      
      const secretKey = getSecretKey();
      return decrypt(encryptedValue, secretKey);
    } catch (error) {
      // Fallback to direct retrieval if decryption fails
      return localStorage.getItem(key);
    }
  },
  
  // Remove persistent item
  removePersistentItem: (key: string): void => {
    localStorage.removeItem(key);
  }
};

// Export default and named exports
export default secureStorage;
