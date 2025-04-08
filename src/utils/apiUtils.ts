import { AxiosRequestConfig } from 'axios';
import { getItem, getUser, getTokens } from './localStorage';
import { User, Tokens } from '../types/auth';
import { Amplify } from 'aws-amplify';

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Request data validation
export const validateRequestData = (data: any, schema: any): { valid: boolean; errors?: string[] } => {
  // Simple validation example - expand based on your needs
  const errors: string[] = [];
  
  Object.keys(schema).forEach(field => {
    if (schema[field].required && !data[field]) {
      errors.push(`${field} is required`);
    }
    
    if (schema[field].type && typeof data[field] !== schema[field].type) {
      errors.push(`${field} must be of type ${schema[field].type}`);
    }
    
    if (schema[field].pattern && !schema[field].pattern.test(data[field])) {
      errors.push(`${field} has invalid format`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors: errors.length ? errors : undefined
  };
};

// Add auth token to requests
export const addAuthHeader = (config: AxiosRequestConfig): AxiosRequestConfig => {
  const token = localStorage.getItem('authToken');
  if (token) {
    const tokenData = JSON.parse(token);
    if (new Date().getTime() <= tokenData.expiry) {
      return {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${tokenData.value}`
        }
      };
    }
    // Token expired, handle refresh or logout
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
  return config;
};

// Utility functions for API and image handling

// Image URL validation helper
export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check for common image extensions
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'];
  const hasValidExtension = validExtensions.some(ext => 
    url.toLowerCase().endsWith(ext)
  );
  
  // Check for invalid file types
  const invalidFiles = ['.DS_Store', 'Thumbs.db', '.json', '.txt', '.pdf'];
  const hasInvalidFile = invalidFiles.some(file => 
    url.includes(file)
  );
  
  return hasValidExtension && !hasInvalidFile;
};

// Error logging for image loading failures
export const handleImageError = (
  url: string, 
  error?: Error, 
  component?: string
): void => {
  // Check for .DS_Store files which are not valid images
  if (url.includes('.DS_Store')) {
    console.warn(`Attempted to load .DS_Store file as image: ${url}`);
    // You may want to report this to your backend to fix the data
    reportInvalidImageToAPI(url, 'DS_STORE_FILE');
    return;
  }
  
  console.error(`Failed to load image: ${url}`, error);
  
  // Add structured logging for better tracking
  const logData = {
    timestamp: new Date().toISOString(),
    url,
    component: component || 'Unknown',
    errorMessage: error?.message || 'Unknown error',
    userAgent: navigator.userAgent,
  };
  
  // For development
  console.debug('Image error details:', logData);
};

// Report invalid images to backend API for cleanup
export const reportInvalidImageToAPI = (
  imageUrl: string, 
  reason: string
): void => {
  // Implementation depends on your API
  // Example: 
  // axios.post('/api/report-invalid-image', { imageUrl, reason })
  //   .catch(err => console.error('Failed to report invalid image', err));
  
  // For now, just log
  console.info(`Image reported as invalid: ${imageUrl}, Reason: ${reason}`);
};

/**
 * Make an authenticated API request to the pilotforce API
 * @param endpoint The API endpoint path (without leading slash)
 * @param options Fetch API options
 * @returns The parsed JSON response
 */
export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  // Try to use credentials-based authentication
  const username = localStorage.getItem('auth_username');
  const password = localStorage.getItem('auth_password');
  
  if (username && password) {
    console.log(`Making credentials-based request to ${endpoint} for user: ${username}`);
    
    // Create the URL
    const apiUrl = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
    const url = `${apiUrl}/${endpoint}`;
    
    // Parse any existing body (if it's a string)
    let existingBody = {};
    if (options.body) {
      try {
        existingBody = typeof options.body === 'string' 
          ? JSON.parse(options.body) 
          : options.body;
      } catch (e) {
        console.warn('Could not parse request body:', e);
      }
    }
    
    // Create a new body with credentials
    const body = JSON.stringify({
      ...existingBody,
      username,
      password
    });
    
    console.log('Request payload:', { 
      ...existingBody, 
      username, 
      password: '********' 
    });
    
    // Prepare request with credentials
    const requestOptions = {
      ...options,
      method: options.method || 'POST',
      headers: {
        ...options.headers,
        'Content-Type': 'application/json'
      },
      body
    };
    
    // Make the request
    try {
      const response = await fetch(url, requestOptions);
      
      // Log the response status
      console.log(`API response from ${endpoint}: ${response.status}`);
      
      // Check if the response is ok
      if (!response.ok) {
        const errorData = await response.text();
        console.error(`API error (${response.status}): ${errorData}`);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      // Get response as text first to log
      const responseText = await response.text();
      console.log(`Raw API response from ${endpoint}:`, responseText);
      
      if (!responseText) {
        return null;
      }
      
      // Then parse as JSON
      try {
        const data = JSON.parse(responseText);
        
        // Handle API Gateway format (with body as string)
        if (data.body && typeof data.body === 'string') {
          try {
            const parsedBody = JSON.parse(data.body);
            console.log(`Parsed API response from ${endpoint}:`, parsedBody);
            return parsedBody;
          } catch (error) {
            console.error('Error parsing response body:', error);
            return data;
          }
        }
        
        return data;
      } catch (jsonError) {
        console.error('Error parsing response as JSON:', jsonError);
        console.log('Raw response was:', responseText);
        return responseText;
      }
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
      throw error;
    }
  }
  
  // Fall back to token-based authentication if credentials aren't available
  const tokens = getTokens();
  const idToken = tokens?.idToken || localStorage.getItem('idToken');
  
  if (!idToken) {
    console.error('No authentication token found for API request to ' + endpoint);
    throw new Error('No authentication token found');
  }
  
  // Create the URL
  const apiUrl = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
  const url = `${apiUrl}/${endpoint}`;
  
  // Prepare headers with authentication
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  };
  
  console.log(`Making authenticated request to ${endpoint} with token: ${idToken.substring(0, 15)}...`);
  
  // Make the request
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Log the response status
    console.log(`API response from ${endpoint}: ${response.status}`);
    
    // Check if the response is ok
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`API error (${response.status}): ${errorData}`);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Handle API Gateway format (with body as string)
    if (data.body && typeof data.body === 'string') {
      try {
        const parsedBody = JSON.parse(data.body);
        console.log(`Parsed API response from ${endpoint}:`, parsedBody);
        return parsedBody;
      } catch (error) {
        console.error('Error parsing response body:', error);
        return data;
      }
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Fetch user data from the /user endpoint
 * @returns User data from the API
 */
export const fetchCurrentUser = async () => {
  try {
    const data = await fetchWithAuth('user');
    console.log('User data fetched from API:', data);
    return data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    
    // Fallback to localStorage
    const localUser = getUser();
    if (localUser) {
      console.log('Using user data from localStorage');
      return { user: localUser };
    }
    
    throw error;
  }
};

/**
 * Log the current user data to console (for debugging)
 */
export const logUserData = () => {
  const user = getUser();
  const tokens = getTokens();
  
  console.log('User data from localStorage:', user);
  console.log('User tokens (redacted):', {
    idToken: tokens?.idToken ? `${tokens.idToken.substring(0, 10)}...` : 'N/A',
    accessToken: tokens?.accessToken ? `${tokens.accessToken.substring(0, 10)}...` : 'N/A',
    refreshToken: tokens?.refreshToken ? 'Present' : 'N/A'
  });
  
  // Make an API call to fetch user data
  fetchCurrentUser()
    .then(data => console.log('User data from API:', data))
    .catch(error => console.error('Failed to fetch user data from API:', error));
};

/**
 * Validate if Amplify API configuration is set up correctly
 * Useful for debugging API configuration issues
 */
export const validateAmplifyConfig = () => {
  // Get the current config
  const currentConfig = Amplify.getConfig();
  
  console.log('Current Amplify Config:', currentConfig);
  
  // Check if API configuration exists
  if (!currentConfig.API || !currentConfig.API.REST) {
    console.error('API configuration is missing in Amplify');
    return false;
  }
  
  // Check if PilotForceAPI is configured
  if (!currentConfig.API.REST.PilotForceAPI) {
    console.error('PilotForceAPI is not configured in Amplify');
    return false;
  }
  
  console.log('Amplify API configuration validation passed');
  return true;
};

/**
 * Check if we're running in a test/mock environment
 */
export const isMockEnvironment = () => {
  return process.env.REACT_APP_USE_MOCK_API === 'true' || 
         !process.env.REACT_APP_API_ENDPOINT || 
         window.location.hostname === 'localhost';
};

export default {
  fetchWithAuth,
  fetchCurrentUser,
  logUserData
};
