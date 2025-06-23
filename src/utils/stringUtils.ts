/**
 * String utility functions for safe string operations
 */

/**
 * Safely convert a string to lowercase
 * Returns empty string if input is null or undefined
 * Converts non-string values to string before applying toLowerCase
 * 
 * @param value - The value to convert to lowercase
 * @returns The lowercase string or empty string if input is null/undefined
 */
export const safeToLowerCase = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Convert to string if it's not already a string
  const str = typeof value === 'string' ? value : String(value);
  return str.toLowerCase();
};

/**
 * Safely check if a string contains a substring (case insensitive)
 * 
 * @param value - The string to check within
 * @param substring - The substring to look for
 * @returns boolean indicating if substring is found, false for null/undefined values
 */
export const safeIncludes = (value: any, substring: string): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  
  const str = typeof value === 'string' ? value : String(value);
  return str.toLowerCase().includes(substring.toLowerCase());
};