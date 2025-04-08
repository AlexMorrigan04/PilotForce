import axios from 'axios';
import { getApiEndpoint } from '../utils/cognitoUtils';

// Create a dedicated auth API instance
const authApi = axios.create({
  // Use the API endpoint for authentication
  baseURL: getApiEndpoint(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for logging
authApi.interceptors.request.use(
  config => {
    // Add auth token if available
    const token = localStorage.getItem('idToken');
    if (token) {
      // Ensure Authorization header is properly set
      config.headers.Authorization = `Bearer ${token}`;
      
      // Log (partial) token being sent - first 10 chars only
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Using token for request to ${config.url}: ${token.substring(0, 10)}...`);
      }
    } else {
      console.warn(`No auth token available for request: ${config.url}`);
    }
    
    // Log full request details in development
    if (process.env.NODE_ENV !== 'production') {
      const sanitizedConfig = { ...config };
      if (sanitizedConfig.data && 
          typeof sanitizedConfig.data === 'object' && 
          sanitizedConfig.data.password) {
        sanitizedConfig.data = { 
          ...sanitizedConfig.data, 
          password: '********'
        };
      }
      console.log(`${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, 
        {
          headers: sanitizedConfig.headers,
          data: sanitizedConfig.data || '(no data)',
          params: sanitizedConfig.params || '(no params)'
        }
      );
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
authApi.interceptors.response.use(
  response => response,
  error => {
    // Create more helpful error message
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Auth API error response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config.url
      });
      
      // Handle specific error codes
      switch (error.response.status) {
        case 403:
          console.warn('403 Forbidden - Check API permissions and API Gateway configuration');
          break;
        case 401:
          console.warn('401 Unauthorized - Invalid or expired token');
          break;
        case 404:
          console.warn(`404 Not Found - Endpoint doesn't exist: ${error.config.url}`);
          break;
      }
      
      // Enhance error with more specific message if available
      if (error.response.data && error.response.data.message) {
        error.message = error.response.data.message;
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Auth API error (no response):', error.request);
      error.message = 'No response received from authentication server';
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Auth API error (request setup):', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default authApi;