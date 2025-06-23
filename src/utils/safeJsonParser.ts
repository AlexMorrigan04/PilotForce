/**
 * Safe JSON Parser Utility
 * Provides safe methods to parse and stringify JSON without throwing exceptions
 */

import secureLogger from './secureLogger';

/**
 * Safely parse a JSON string
 * @param json JSON string to parse
 * @param defaultValue Default value to return if parsing fails
 * @returns Parsed object or default value
 */
export function safeParseJson<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue;
  
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    secureLogger.warn('Failed to parse JSON', { error: (error as Error).message });
    return defaultValue;
  }
}

/**
 * Safely stringify a value to JSON
 * @param value Value to stringify
 * @param defaultValue Default value to return if stringification fails
 * @returns JSON string or default value
 */
export function safeStringifyJson(value: any, defaultValue = '{}'): string {
  if (value === undefined || value === null) return defaultValue;
  
  try {
    return JSON.stringify(value);
  } catch (error) {
    secureLogger.warn('Failed to stringify to JSON', { error: (error as Error).message });
    return defaultValue;
  }
}

/**
 * Safely parse and validate JSON against a schema
 * @param json JSON string to parse
 * @param validator Function to validate the parsed object
 * @param defaultValue Default value to return if parsing or validation fails
 * @returns Validated object or default value
 */
export function parseAndValidateJson<T>(
  json: string | null | undefined, 
  validator: (obj: any) => boolean,
  defaultValue: T
): T {
  if (!json) return defaultValue;
  
  try {
    const parsed = JSON.parse(json);
    return validator(parsed) ? parsed as T : defaultValue;
  } catch (error) {
    secureLogger.warn('Failed to parse or validate JSON', { error: (error as Error).message });
    return defaultValue;
  }
}

export default {
  safeParseJson,
  safeStringifyJson,
  parseAndValidateJson
};
