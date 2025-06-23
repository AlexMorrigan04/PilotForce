/**
 * Secure Logger
 * Provides centralized, secure logging functionality
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Environment-based logging configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// Redacted placeholder for sensitive data
const REDACTED = '[REDACTED]';

/**
 * List of sensitive keywords to detect in log messages
 */
const SENSITIVE_KEYWORDS = [
  'password',
  'token',
  'key',
  'secret',
  'auth',
  'credential',
  'jwt',
  'session',
  'api-key'
];

/**
 * Detect if a string potentially contains sensitive information
 * @param str String to check
 * @returns True if string might contain sensitive data
 */
const mightContainSensitiveData = (str: string): boolean => {
  const lowerStr = String(str).toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => lowerStr.includes(keyword));
};

/**
 * Sanitize an object by redacting sensitive values
 * @param obj Input object
 * @returns Sanitized object
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  // Handle objects
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if key might be sensitive
    if (mightContainSensitiveData(key)) {
      result[key] = REDACTED;
    } 
    // For non-sensitive keys, check value type
    else if (typeof value === 'string' && mightContainSensitiveData(value)) {
      result[key] = REDACTED;
    }
    else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } 
    else {
      result[key] = value;
    }
  }
  
  return result;
};

/**
 * Format log arguments to ensure no sensitive data is logged
 * @param args Arguments to format
 * @returns Sanitized arguments
 */
const formatLogArgs = (args: any[]): any[] => {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      return sanitizeObject(arg);
    }
    if (typeof arg === 'string' && mightContainSensitiveData(arg)) {
      return REDACTED;
    }
    return arg;
  });
};

/**
 * Send log to remote logging service if configured
 * @param level Log level
 * @param args Log arguments
 */
const sendRemoteLog = async (level: LogLevel, args: any[]): Promise<void> => {
  // Only send remote logs in production to avoid excessive API calls during development
  const remoteLoggingUrl = process.env.REACT_APP_LOGGING_SERVICE_URL;
  if (!isDevelopment && remoteLoggingUrl) {
    try {
      const sanitizedArgs = formatLogArgs(args);
      
      // Don't await the response - fire and forget to avoid performance impact
      fetch(remoteLoggingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add CSRF token if available
          ...(window.__CSRF_TOKEN__ && { 'X-CSRF-Token': window.__CSRF_TOKEN__ })
        },
        body: JSON.stringify({
          level,
          message: sanitizedArgs.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' '),
          timestamp: new Date().toISOString(),
          app: 'pilotforce',
          environment: process.env.NODE_ENV
        })
      }).catch(() => {
        // Silently fail - logging should never break the application
      });
    } catch (e) {
      // Silently fail
    }
  }
};

/**
 * Debug level log - only shown in development
 */
const debug = (...args: any[]): void => {
  if (isDevelopment) {
    // Only log in development
  }
};

/**
 * Info level log
 */
const info = (...args: any[]): void => {
  const sanitizedArgs = formatLogArgs(args);
  
  if (isDevelopment || process.env.REACT_APP_LOG_LEVEL === 'info') {
  }
  
  sendRemoteLog('info', args);
};

/**
 * Warning level log
 */
const warn = (...args: any[]): void => {
  const sanitizedArgs = formatLogArgs(args);
  sendRemoteLog('warn', args);
};

/**
 * Error level log
 */
const error = (...args: any[]): void => {
  const sanitizedArgs = formatLogArgs(args);
  sendRemoteLog('error', args);
};

export default {
  debug,
  info,
  warn,
  error
};

// Add TypeScript declaration for global CSRF token
declare global {
  interface Window {
    __CSRF_TOKEN__?: string;
  }
}
