/**
 * Security Validator Utility
 * Provides functions to validate and sanitize user inputs
 */

/**
 * Sanitize a string to prevent SQL injection
 * @param input String to sanitize
 * @param pattern Regex pattern to allow (defaults to alphanumeric, spaces, and common punctuation)
 * @returns Sanitized string
 */
export const sanitizeString = (
  input: string | undefined | null, 
  pattern = /[^\w\s.,\-@:;?!()[\]{}]/g
): string => {
  if (input === undefined || input === null) {
    return '';
  }
  
  return input.replace(pattern, '');
};

/**
 * Sanitize an ID to prevent SQL injection
 * @param id ID to sanitize
 * @returns Sanitized ID
 */
export const sanitizeId = (id: string | undefined | null): string => {
  if (id === undefined || id === null) {
    return '';
  }
  
  return id.replace(/[^\w\-]/g, '');
};

/**
 * Sanitize an email address
 * @param email Email to sanitize
 * @returns Sanitized email
 */
export const sanitizeEmail = (email: string | undefined | null): string => {
  if (email === undefined || email === null) {
    return '';
  }
  
  // Basic email validation pattern
  return email.replace(/[^\w@.\-_]/g, '');
};

/**
 * Sanitize a username
 * @param username Username to sanitize
 * @returns Sanitized username
 */
export const sanitizeUsername = (username: string | undefined | null): string => {
  if (username === undefined || username === null) {
    return '';
  }
  
  return username.replace(/[^\w@.\-_]/g, '');
};

/**
 * Safely encode a URL component
 * @param part String to encode
 * @returns Safely encoded string
 */
export const safeEncodeURIComponent = (part: string | undefined | null): string => {
  if (part === undefined || part === null) {
    return '';
  }
  
  return encodeURIComponent(part)
    .replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
};

/**
 * Validate a URL is in an allowed domain list
 * @param url URL to validate
 * @param allowedDomains List of allowed domains
 * @returns True if URL is from an allowed domain
 */
export const isAllowedDomain = (
  url: string | undefined | null, 
  allowedDomains: string[] = []
): boolean => {
  if (url === undefined || url === null) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    return allowedDomains.some(domain => urlObj.hostname.endsWith(domain));
  } catch (e) {
    return false;
  }
};

/**
 * Generate a secure random string
 * @param length Length of string to generate
 * @returns Random string
 */
export const generateRandomString = (length = 32): string => {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export default {
  sanitizeString,
  sanitizeId,
  sanitizeEmail,
  sanitizeUsername,
  safeEncodeURIComponent,
  isAllowedDomain,
  generateRandomString
};
