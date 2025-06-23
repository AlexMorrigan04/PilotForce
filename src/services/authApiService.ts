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
      }
    } else {
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
      
      // Handle specific error codes
      switch (error.response.status) {
        case 403:
          break;
        case 401:
          break;
        case 404:
          break;
      }
      
      // Enhance error with more specific message if available
      if (error.response.data && error.response.data.message) {
        error.message = error.response.data.message;
      }
    } else if (error.request) {
      // The request was made but no response was received
      error.message = 'No response received from authentication server';
    } else {
      // Something happened in setting up the request that triggered an Error
    }
    
    return Promise.reject(error);
  }
);

export default authApi;