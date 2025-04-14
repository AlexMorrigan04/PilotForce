import axios from 'axios';

// Get API base URL from environment or use default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to every request
api.interceptors.request.use(
  (config) => {
    // Get token from local storage
    const idToken = localStorage.getItem('idToken');
    const accessToken = localStorage.getItem('accessToken');
    
    // If token exists, add to headers
    if (idToken) {
      config.headers.Authorization = `Bearer ${idToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    // If response has a body field that's a string, try to parse it
    // (This is for API Gateway responses that might nest the actual response)
    if (response.data && response.data.body && typeof response.data.body === 'string') {
      try {
        response.data = JSON.parse(response.data.body);
      } catch (e) {
        console.error('Error parsing response body:', e);
      }
    }
    return response;
  },
  (error) => {
    // Handle specific error codes
    if (error.response) {
      if (error.response.status === 401) {
        // Handle unauthorized (expired token etc.)
        console.log('Unauthorized request - redirecting to login');
        localStorage.removeItem('idToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Could redirect to login page here
        // window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
