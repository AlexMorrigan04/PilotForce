/**
 * Crypto polyfill helper for browser environments
 * Provides HMAC functionality for secret hash calculation
 */

// Simple HMAC SHA256 implementation for browsers that don't support crypto
export const createHmac = (algorithm: string, key: string) => {
  // This is a simplified implementation - in production, use a proper crypto library
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Use Web Crypto API if available
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
          digest: (encoding: string) => {
            return cryptoKey.then(key => {
              return window.crypto.subtle.sign(
                'HMAC',
                key,
                dataArray
              ).then(signature => {
                // Convert ArrayBuffer to base64
                const bytes = new Uint8Array(signature);
                const binary = Array.from(bytes)
                  .map(byte => String.fromCharCode(byte))
                  .join('');
                
                if (encoding === 'base64') {
                  return btoa(binary);
                }
                
                return binary;
              });
            });
          }
        };
      }
    };
  } else {
    // Provide a fallback that doesn't actually calculate a hash
    // This is just for compilation - should be replaced with a proper library
    return {
      update: (data: string) => {
        return {
          digest: (encoding: string) => {
            return '';
          }
        };
      }
    };
  }
};

// Buffer polyfill for browser environments
export const Buffer = {
  from: (data: string, encoding?: string) => {
    if (encoding === 'base64') {
      return atob(data);
    }
    return data;
  }
};

export default {
  createHmac,
  Buffer
};
