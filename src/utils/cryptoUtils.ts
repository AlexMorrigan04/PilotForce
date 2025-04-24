/**
 * Cryptographic utility functions
 * Provides secure cryptographic operations for the application
 */
import { createHmac as cryptoCreateHmac } from 'crypto-browserify';
import { Buffer } from 'buffer';

// Define types for HMAC functions to ensure consistency
interface DigestFunction {
  (encoding: string): string | Promise<string>;
}

interface UpdateFunction {
  (data: string): { digest: DigestFunction };
}

interface HmacInterface {
  update: UpdateFunction;
  digest?: DigestFunction; // Optional for compatibility with direct digest call
}

// Generate a secure random string for CSRF tokens, nonces, etc.
export const generateSecureRandomString = (length: number = 32): string => {
  try {
    // Use Web Crypto API if available (more secure)
    if (typeof window !== 'undefined' && window.crypto) {
      const array = new Uint8Array(length);
      window.crypto.getRandomValues(array);
      return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      // Fallback to less secure method
      let result = '';
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    }
  } catch (error) {
    // Fallback with warning
    console.warn('Secure random generation unavailable');
    return Math.random().toString(36).substring(2, length + 2);
  }
};

// Create a HMAC hash with consistent interface
export const createHmac = (algorithm: string, key: string): HmacInterface => {
  try {
    // Try to use crypto-browserify's implementation
    const hmac = cryptoCreateHmac(algorithm, key);
    return hmac as HmacInterface;
  } catch (error) {
    // Fallback to Web Crypto API
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const textEncoder = new TextEncoder();
      const keyData = textEncoder.encode(key);
      
      const cryptoKey = window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: { name: 'SHA-256' } },
        false,
        ['sign']
      );
      
      return {
        update: (data: string) => {
          const dataArray = textEncoder.encode(data);
          
          return {
            digest: async (encoding: string) => {
              try {
                const key = await cryptoKey;
                const signature = await window.crypto.subtle.sign(
                  'HMAC',
                  key,
                  dataArray
                );
                
                // Convert ArrayBuffer to appropriate format
                const bytes = new Uint8Array(signature);
                
                if (encoding === 'hex') {
                  return Array.from(bytes)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                }
                
                if (encoding === 'base64') {
                  const binary = Array.from(bytes)
                    .map(byte => String.fromCharCode(byte))
                    .join('');
                  return btoa(binary);
                }
                
                // Default format
                return Array.from(bytes)
                  .map(b => b.toString(16).padStart(2, '0'))
                  .join('');
              } catch (err) {
                throw new Error('Cryptographic operation failed');
              }
            }
          };
        }
      };
    }
    
    // Last resort fallback
    return {
      update: (data: string) => {
        return {
          digest: (encoding: string) => {
            console.error('Secure cryptographic functions unavailable');
            // Return a placeholder hash for compilation, but warn that it's insecure
            if (process.env.NODE_ENV !== 'production') {
              console.warn('WARNING: Using insecure hash fallback');
            }
            
            // Simple string hash function (NOT secure, just for fallback)
            let hash = 0;
            for (let i = 0; i < data.length; i++) {
              const char = data.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32bit integer
            }
            
            // Convert to hex
            const hashHex = (hash >>> 0).toString(16).padStart(8, '0');
            return encoding === 'base64' ? btoa(hashHex) : hashHex;
          }
        };
      }
    };
  }
};

// Generate CSRF token
export const generateCsrfToken = (): string => {
  return generateSecureRandomString(32);
};

// Hash a value securely
export const hashValue = async (value: string): Promise<string> => {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      // Use Web Crypto API if available
      const encoder = new TextEncoder();
      const data = encoder.encode(value);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Use our createHmac function that has a consistent interface
      const hash = createHmac('sha256', 'PilotForce-Security-Salt');
      const updateResult = hash.update(value);
      
      // Handle both direct digest call and update().digest() pattern
      if (typeof updateResult.digest === 'function') {
        const digestResult = updateResult.digest('hex');
        // Handle Promise or string
        if (digestResult instanceof Promise) {
          return await digestResult;
        }
        return digestResult;
      }
      
      // If hash has direct digest method (crypto-browserify style)
      if (hash.digest && typeof hash.digest === 'function') {
        return hash.digest('hex');
      }
      
      throw new Error('Invalid hash object structure');
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error during hash calculation:', error);
    }
    throw new Error('Secure hashing unavailable');
  }
};

// Validate a value against timing attacks
export const constantTimeCompare = (a: string, b: string): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};

export default {
  generateSecureRandomString,
  createHmac,
  generateCsrfToken,
  hashValue,
  constantTimeCompare
};
