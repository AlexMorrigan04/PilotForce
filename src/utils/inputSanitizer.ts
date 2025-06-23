/**
 * Input Sanitizer Utility
 * Provides functions to sanitize various types of user inputs
 */

/**
 * Strip HTML tags from a string
 * @param input String to sanitize
 * @returns Sanitized string with HTML tags removed
 */
export function stripHtml(input: string | undefined | null): string {
  if (input === undefined || input === null) {
    return '';
  }
  
  return input
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .replace(/&lt;/g, '<')    // Replace HTML entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Sanitize a string for use in SQL queries
 * @param input String to sanitize
 * @returns SQL-safe string
 */
export function sanitizeSqlString(input: string | undefined | null): string {
  if (input === undefined || input === null) {
    return '';
  }
  
  return input
    .replace(/'/g, "''")       // Escape single quotes with double quotes
    .replace(/\\/g, '\\\\');   // Escape backslashes with double backslashes
}

/**
 * Sanitize a free text input for general use
 * @param input String to sanitize
 * @param maxLength Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeText(input: string | undefined | null, maxLength = 1000): string {
  if (input === undefined || input === null) {
    return '';
  }
  
  // Remove control characters and trim
  let sanitized = input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
  
  // Truncate if longer than maxLength
  if (maxLength > 0 && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize a string for use as an HTML ID or class name
 * @param input String to sanitize
 * @returns Safe ID string
 */
export function sanitizeCssIdentifier(input: string | undefined | null): string {
  if (input === undefined || input === null) {
    return '';
  }
  
  // CSS identifiers cannot start with digits, so prefix with 'id-' if needed
  const sanitized = input.replace(/[^a-zA-Z0-9_-]/g, '-');
  return /^\d/.test(sanitized) ? `id-${sanitized}` : sanitized;
}

/**
 * Sanitize a string for use in JSON
 * @param input String to sanitize
 * @returns JSON-safe string
 */
export function sanitizeJsonString(input: string | undefined | null): string {
  if (input === undefined || input === null) {
    return '';
  }
  
  return input
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/"/g, '\\"')    // Escape double quotes
    .replace(/\n/g, '\\n')   // Escape newlines
    .replace(/\r/g, '\\r')   // Escape carriage returns
    .replace(/\t/g, '\\t')   // Escape tabs
    .replace(/\f/g, '\\f');  // Escape form feeds
}

/**
 * Sanitize a phone number
 * @param input Phone number to sanitize
 * @returns Sanitized phone number with only digits
 */
export function sanitizePhoneNumber(input: string | undefined | null): string {
  if (input === undefined || input === null) {
    return '';
  }
  
  return input.replace(/[^\d+]/g, '');
}

/**
 * Sanitize a string for use in a filename
 * @param input String to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(input: string | undefined | null): string {
  if (input === undefined || input === null) {
    return 'file';
  }
  
  return input
    .replace(/[^a-zA-Z0-9_.-]/g, '_')  // Replace invalid chars with underscore
    .replace(/\.\./g, '_');            // Prevent path traversal
}

export default {
  stripHtml,
  sanitizeSqlString,
  sanitizeText,
  sanitizeCssIdentifier,
  sanitizeJsonString,
  sanitizePhoneNumber,
  sanitizeFilename
};
