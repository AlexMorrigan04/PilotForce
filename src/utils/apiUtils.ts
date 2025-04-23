import { AxiosRequestConfig } from 'axios';
import { getItem, getUser, getTokens } from './localStorage';
import { User, Tokens } from '../types/auth';

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
  // Create the URL - use the production API URL, not localhost
  const apiUrl = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
  const url = `${apiUrl}/${endpoint}`;
  
  // Try to use credentials-based authentication
  const username = localStorage.getItem('auth_username');
  const password = localStorage.getItem('auth_password');
  
  if (username && password) {
    
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
      
      // Check if the response is ok
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      // Get response as text first to log
      const responseText = await response.text();
      
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
            return parsedBody;
          } catch (error) {
            return data;
          }
        }
        
        return data;
      } catch (jsonError) {
        return responseText;
      }
    } catch (error) {
      throw error;
    }
  }
  
  // Fall back to token-based authentication if credentials aren't available
  const tokens = getTokens();
  const idToken = tokens?.idToken || localStorage.getItem('idToken');
  
  if (!idToken) {
    throw new Error('No authentication token found');
  }
  
  // Prepare headers with authentication
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  };
  
  
  // Make the request
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Log the response status
    
    // Check if the response is ok
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Handle API Gateway format (with body as string)
    if (data.body && typeof data.body === 'string') {
      try {
        const parsedBody = JSON.parse(data.body);
        return parsedBody;
      } catch (error) {
        return data;
      }
    }
    
    return data;
  } catch (error) {
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
    return data;
  } catch (error) {
    
    // Fallback to localStorage
    const localUser = getUser();
    if (localUser) {
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
  
  // Make an API call to fetch user data
  fetchCurrentUser()
    .then(data => console.log('User data from API:', data))
    .catch(error => console.error('Failed to fetch user data from API:', error));
};

/**
 * Validate API configuration and ensure endpoints are accessible
 * This is a simplified replacement for the amplify configuration check
 */
export const validateAmplifyConfig = () => {
  // Check that important environment variables are set
  const apiUrl = process.env.REACT_APP_API_URL || '';
  const cognitoPoolId = process.env.REACT_APP_USER_POOL_ID || '';
  
  if (!apiUrl) {
    console.warn('REACT_APP_API_URL is not defined - API calls might fail');
  }
  
  if (!cognitoPoolId) {
    console.warn('REACT_APP_USER_POOL_ID is not defined - authentication might fail');
  }
  
  // Check if we have authentication tokens
  const hasToken = !!localStorage.getItem('idToken');

  
  return true;
};

// Define API utility functions that don't rely on Amplify
export const API = {
  // Get all users
  getUsers: async () => {
    try {
      return await fetchWithAuth('admin/users', { method: 'GET' });
    } catch (error) {
      throw error;
    }
  },
  
  // Get a specific user
  getUser: async (userId: string) => {
    try {
      return await fetchWithAuth(`admin/users/${userId}`, { method: 'GET' });
    } catch (error) {
      throw error;
    }
  },
  
  // Update a user
  updateUser: async (userId: string, userData: any) => {
    try {
      return await fetchWithAuth(`admin/users/${userId}`, { 
        method: 'PUT',
        body: JSON.stringify(userData)
      });
    } catch (error) {
      throw error;
    }
  },
  
  // Delete a user
  deleteUser: async (userId: string) => {
    try {
      return await fetchWithAuth(`admin/users/${userId}`, { method: 'DELETE' });
    } catch (error) {
      throw error;
    }
  },
  
  // Toggle user access (enable/disable)
  toggleUserAccess: async (userId: string, isEnabled: boolean) => {
    try {
      return await fetchWithAuth(`admin/users/${userId}/access`, { 
        method: 'PUT',
        body: JSON.stringify({ isEnabled })
      });
    } catch (error) {
      throw error;
    }
  },
  
  // Add signup function
  signup: async (userData: any) => {
    try {
      // Make sure we're using the production API URL
      const apiUrl = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
      const url = `${apiUrl}/signup`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Signup failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },
  
  // Add confirmation function
  confirmSignup: async (username: string, code: string) => {
    try {
      
      // Make sure we're using the production API URL
      const apiUrl = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
      const url = `${apiUrl}/confirm-signup`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          confirmationCode: code
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Confirmation failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Check if we're running in a test/mock environment
 */
export const isMockEnvironment = () => {
  return process.env.REACT_APP_USE_MOCK_API === 'true' || 
         !process.env.REACT_APP_API_ENDPOINT || 
         window.location.hostname === 'localhost';
};

// Add an environment detection helper
export const getApiBaseUrl = () => {
  // Explicitly check for localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Check if we have a defined local API URL
    const localApiUrl = process.env.REACT_APP_LOCAL_API_URL;
    if (localApiUrl) {
      return localApiUrl;
    }
    
    // If running locally, but the API isn't, make sure we use the production API
  }
  
  // Default to production API
  return process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
};

export default {
  fetchWithAuth,
  fetchCurrentUser,
  logUserData
};
