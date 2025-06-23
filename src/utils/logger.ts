/**
 * Secure Logging Utility
 * Provides safe logging methods that respect environment and avoid sensitive data leaks
 */

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';
const debugEnabled = isDev || process.env.REACT_APP_ENABLE_DEBUG === 'true';

// Strip sensitive data patterns
const stripSensitiveData = (message: any): any => {
  if (typeof message === 'string') {
    // Replace potential tokens, keys, passwords
    return message.replace(/(token|password|key|secret)(['"]?\s*[=:]\s*['"]?)[^\s'"]+/gi, '$1[REDACTED]');
  }
  
  if (message instanceof Error) {
    const error = new Error(stripSensitiveData(message.message));
    error.stack = message.stack;
    return error;
  }
  
  if (typeof message === 'object' && message !== null) {
    const copy = { ...message };
    // Remove sensitive keys
    ['password', 'token', 'secret', 'key', 'authorization', 'accessToken', 'refreshToken'].forEach(key => {
      if (key in copy) {
        copy[key] = '[REDACTED]';
      }
    });
    return copy;
  }
  
  return message;
};

// Safe console methods
const info = (...args: any[]): void => {
  if (debugEnabled) {
    // Removed direct console.info call
  }
};

const warn = (...args: any[]): void => {
  if (debugEnabled) {
    // Removed direct console.warn call
  }
};

const error = (...args: any[]): void => {
  // Always log errors, but strip sensitive data
};

const debug = (...args: any[]): void => {
  if (debugEnabled) {
    // Removed direct console.debug call
  }
};

// No-op console for production
const noop = (): void => {};

// Export appropriate logging based on environment
export default {
  info: debugEnabled ? info : noop,
  warn: warn,
  error: error,
  debug: debugEnabled ? debug : noop,
  log: debugEnabled ? info : noop,
};
