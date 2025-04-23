/**
 * Utility for consistent debug logging
 */

// Enable or disable detailed logging (can be controlled by environment)
const DEBUG_MODE = true;

/**
 * Log API response for debugging
 * @param source The component or service that received the response
 * @param response The API response data
 */
export const logApiResponse = (source: string, response: any) => {
  if (!DEBUG_MODE) return;
  
  console.group(`🌐 API Response - ${source}`);
  try {
    
    // Extract and log main data structures if available
    if (response && typeof response === 'object') {
      if (Array.isArray(response)) {
        if (response.length > 0) {
        }
      } else {
        // Log keys and their types/sizes
        const keys = Object.keys(response);
        
        keys.forEach(key => {
          const value = response[key];
          if (Array.isArray(value)) {
            if (value.length > 0) {
            }
          } else if (value && typeof value === 'object') {
          } else {
          }
        });
      }
    }
  } catch (e) {
  }
  console.groupEnd();
};

/**
 * Log component data flow for debugging
 * @param component The component name
 * @param data The data to log
 * @param description Optional description
 */
export const logComponentData = (component: string, data: any, description: string = 'Data') => {
  if (!DEBUG_MODE) return;
  
  console.group(`🧩 ${component} - ${description}`);
  try {
    if (data && Array.isArray(data)) {
      if (data.length > 0) {
      }
    }
  } catch (e) {
  }
  console.groupEnd();
};

export default {
  logApiResponse,
  logComponentData
};
