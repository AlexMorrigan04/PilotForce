import axios from 'axios';
import { getApiEndpoint } from '../utils/cognitoUtils';

// Create axios instance with default config
const api = axios.create({
  baseURL: getApiEndpoint(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests when available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('idToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('No token found in localStorage. Ensure the user is logged in.');
  }
  return config;
});

// Add error handling interceptor
api.interceptors.response.use(
  response => response,
  error => {
    // Handle session expiry
    if (error.response?.status === 401) {
      // Try to get a better error message
      const errorMessage = error.response.data?.message || 'Your session has expired. Please log in again.';
      console.warn('Authentication error:', errorMessage);
      
      // Redirect to login only if we're not already there
      if (!window.location.pathname.includes('/login')) {
        // Store the current page so we can return after login
        const returnPath = window.location.pathname;
        window.location.href = `/login?returnTo=${encodeURIComponent(returnPath)}`;
      }
    }
    
    // Return the error for handling in the components
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authApi = {
  // Log in user - goes through API Gateway
  login: async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      
      // Store tokens from the response
      if (response.data.tokens) {
        localStorage.setItem('idToken', response.data.tokens.idToken);
        localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
        localStorage.setItem('accessToken', response.data.tokens.accessToken);
      }
      
      // Store user data
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Register new user - goes through API Gateway
  signup: async (userData: {
    username: string;
    password: string;
    email: string;
    companyId?: string;
    attributes?: Record<string, string>;
  }) => {
    try {
      const response = await api.post('/auth/signup', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Confirm user registration - goes through API Gateway
  confirmSignup: async (username: string, confirmationCode: string) => {
    try {
      const response = await api.post('/auth/confirm', { 
        username, 
        confirmationCode 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Resend confirmation code - goes through API Gateway
  resendConfirmationCode: async (username: string) => {
    try {
      const response = await api.post('/auth/resend-code', { username });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Log out user - invalidate tokens on server
  logout: async () => {
    try {
      await api.post('/auth/logout');
      
      // Clear localStorage regardless of server response
      localStorage.removeItem('idToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      
      return { success: true };
    } catch (error) {
      
      // Still clear localStorage even if server call fails
      localStorage.removeItem('idToken');
      localStorage.removeItem('refreshToken'); 
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      
      throw error;
    }
  },
  
  // Get current user data - from API
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/user');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Check if tokens are valid
  checkAuth: async () => {
    try {
      const response = await api.get('/auth/validate');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// User and company APIs
export const userApi = {
  // Get current user
  getCurrentUser: async () => {
    try {
      return await api.get('/user');  // Updated to match API Gateway schema
    } catch (error) {
      throw error;
    }
  },
  
  // Get user by ID
  getUserById: async (userId: string) => {
    try {
      return await api.get(`/user?userId=${userId}`);  // Updated to match API Gateway query parameter style
    } catch (error) {
      throw error;
    }
  },
  
  // Get user stats (includes assets, bookings, and media counts)
  getUserStats: async (companyId: string) => {
    try {
      return await api.get(`/user-status?companyId=${companyId}`);
    } catch (error) {
      throw error;
    }
  },
  
  // Get company data
  getCompanyById: async (companyId: string) => {
    try {
      // Note: Using bookings endpoint to get company-related data
      return await api.get(`/bookings?companyId=${companyId}`);
    } catch (error) {
      throw error;
    }
  },
  
  // Update user profile
  updateUserProfile: async (userData: any) => {
    try {
      return await api.put('/user-status', userData);  // Updated to match API Gateway schema
    } catch (error) {
      throw error;
    }
  }
};

export default api;
