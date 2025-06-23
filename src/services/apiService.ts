import axios from 'axios';
import config from '../utils/environmentConfig';
import secureLogger from '../utils/secureLogger'; // Fixed import
import secureStorage from '../utils/secureStorage';
import securityValidator from '../utils/securityValidator';
import csrfProtection from '../utils/csrfProtection';

// Create axios instance with default config
const api = axios.create({
  baseURL: config.getGatewayUrl(''),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token and CSRF protection to requests when available
api.interceptors.request.use(async (config) => {
  // Add auth token if available
  const tokens = secureStorage.getAuthTokens();
  if (tokens?.idToken) {
    config.headers.Authorization = `Bearer ${tokens.idToken}`;
  } else {
    // Log using secure logger
    secureLogger.info('Authentication token not found. User may not be logged in.');
  }
  
  // Add CSRF protection
  return await csrfProtection.addCsrfToAxios(config);
});

// Add error handling interceptor
api.interceptors.response.use(
  response => response,
  error => {
    // Handle session expiry
    if (error.response?.status === 401) {
      // Try to get a better error message - avoid showing sensitive info
      const errorMessage = 'Your session has expired. Please log in again.';
      
      // Only log minimal information, not sensitive data
      secureLogger.warn('Session expired. Redirecting to login.');
      
      // Redirect to login only if we're not already there
      if (!window.location.pathname.includes('/login')) {
        // Store the current page so we can return after login
        const returnPath = window.location.pathname;
        window.location.href = `/login?returnTo=${securityValidator.safeEncodeURIComponent(returnPath)}`;
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
      // Sanitize username to prevent SQL injection
      const sanitizedUsername = securityValidator.sanitizeUsername(username);
      
      const response = await api.post(config.API.ENDPOINTS.LOGIN, { 
        username: sanitizedUsername,
        password: password  // password is never directly used in SQL queries
      });
      
      // Store tokens from the response
      if (response.data.tokens) {
        // Use secureStorage instead of localStorage
        secureStorage.storeAuthTokens(
          response.data.tokens.idToken,
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }
      
      // Store user data
      if (response.data.user) {
        secureStorage.storeUserData(response.data.user);
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
      // Sanitize inputs to prevent SQL injection
      const sanitizedData = {
        ...userData,
        username: securityValidator.sanitizeUsername(userData.username),
        email: securityValidator.sanitizeEmail(userData.email),
        companyId: userData.companyId ? securityValidator.sanitizeId(userData.companyId) : undefined
      };
      
      const response = await api.post(config.API.ENDPOINTS.SIGNUP, sanitizedData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Confirm user registration - goes through API Gateway
  confirmSignup: async (username: string, confirmationCode: string) => {
    try {
      // Sanitize inputs to prevent SQL injection
      const sanitizedUsername = securityValidator.sanitizeUsername(username);
      const sanitizedCode = confirmationCode.replace(/[^\d]/g, '');
      
      const response = await api.post(config.API.ENDPOINTS.CONFIRM, { 
        username: sanitizedUsername, 
        confirmationCode: sanitizedCode 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Resend confirmation code - goes through API Gateway
  resendConfirmationCode: async (username: string) => {
    try {
      // Sanitize username to prevent SQL injection
      const sanitizedUsername = securityValidator.sanitizeUsername(username);
      
      const response = await api.post('/auth/resend-code', { username: sanitizedUsername });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Log out user - invalidate tokens on server
  logout: async () => {
    try {
      await api.post('/auth/logout');
      
      // Clear storage
      secureStorage.clearAuthTokens();
      
      return { success: true };
    } catch (error) {
      // Still clear storage even if server call fails
      secureStorage.clearAuthTokens();
      
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
      return await api.get('/user');
    } catch (error) {
      throw error;
    }
  },
  
  // Get user by ID
  getUserById: async (userId: string) => {
    try {
      // Sanitize userId parameter to prevent SQL injection
      const sanitizedUserId = securityValidator.sanitizeId(userId);
      
      return await api.get(`/user?userId=${encodeURIComponent(sanitizedUserId)}`);
    } catch (error) {
      throw error;
    }
  },
  
  // Get user stats (includes assets, bookings, and media counts)
  getUserStats: async (companyId: string) => {
    try {
      // Sanitize companyId parameter to prevent SQL injection
      const sanitizedCompanyId = securityValidator.sanitizeId(companyId);
      
      return await api.get(`/user-status?companyId=${encodeURIComponent(sanitizedCompanyId)}`);
    } catch (error) {
      throw error;
    }
  },
  
  // Get company data
  getCompanyById: async (companyId: string) => {
    try {
      // Sanitize companyId parameter to prevent SQL injection
      const sanitizedCompanyId = securityValidator.sanitizeId(companyId);
      
      return await api.get(`/bookings?companyId=${encodeURIComponent(sanitizedCompanyId)}`);
    } catch (error) {
      throw error;
    }
  },
  
  // Update user profile
  updateUserProfile: async (userData: any) => {
    try {
      // Create a sanitized copy of userData to prevent SQL injection
      const sanitizedUserData = {
        ...userData,
        // Sanitize specific fields that might be used in database queries
        id: userData.id ? securityValidator.sanitizeId(userData.id) : undefined,
        username: userData.username ? securityValidator.sanitizeUsername(userData.username) : undefined,
        email: userData.email ? securityValidator.sanitizeEmail(userData.email) : undefined,
        companyId: userData.companyId ? securityValidator.sanitizeId(userData.companyId) : undefined
      };
      
      return await api.put('/user-status', sanitizedUserData);
    } catch (error) {
      throw error;
    }
  }
};

export default api;
