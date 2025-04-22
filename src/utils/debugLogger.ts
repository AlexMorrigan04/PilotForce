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
    console.log('Raw data:', response);
    
    // Extract and log main data structures if available
    if (response && typeof response === 'object') {
      if (Array.isArray(response)) {
        console.log(`Array with ${response.length} items`);
        if (response.length > 0) {
          console.log('First item sample:', response[0]);
        }
      } else {
        // Log keys and their types/sizes
        const keys = Object.keys(response);
        console.log(`Object with ${keys.length} keys:`, keys);
        
        keys.forEach(key => {
          const value = response[key];
          if (Array.isArray(value)) {
            console.log(`${key}: Array with ${value.length} items`);
            if (value.length > 0) {
              console.log(`${key} first item sample:`, value[0]);
            }
          } else if (value && typeof value === 'object') {
            console.log(`${key}: Object with keys:`, Object.keys(value));
          } else {
            console.log(`${key}:`, value);
          }
        });
      }
    }
  } catch (e) {
    console.error('Error logging API response:', e);
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
    console.log(data);
    if (data && Array.isArray(data)) {
      console.log(`Array length: ${data.length}`);
      if (data.length > 0) {
        console.log('Sample item:', data[0]);
      }
    }
  } catch (e) {
    console.error('Error logging component data:', e);
  }
  console.groupEnd();
};

export default {
  logApiResponse,
  logComponentData
};
