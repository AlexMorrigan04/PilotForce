import axios from 'axios';
import { getApiEndpoint } from '../utils/cognitoUtils';
import cognitoService from './cognitoService';
import { API, getApiBaseUrl } from '../utils/apiUtils';
import { AUTH_ENDPOINTS, logEndpoint } from '../utils/endpoints';
import logger from '../utils/logger';
import { securityAuditLogger } from '../utils/securityAuditLogger';
import secureLogger from '../utils/secureLogger';

// Verify the security logger is imported
secureLogger.info('AuthServices: SecurityAuditLogger imported successfully');

// Get the API endpoint from environment variables or use the default
const API_URL = getApiEndpoint();

// Add CORS proxy support for development environments
const getProxiedUrl = (originalUrl: string): string => {
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Use a CORS proxy for development
    // Options:
    // 1. cors-anywhere: https://cors-anywhere.herokuapp.com/
    // 2. Local proxy in package.json (recommended)
    // 3. thingproxy: https://thingproxy.freeboard.io/fetch/
    
    // First try using the proxy defined in package.json
    if (process.env.REACT_APP_USE_PROXY === 'true') {
      // Strip the domain and use relative path which will be proxied via package.json
      const url = new URL(originalUrl);
      return url.pathname + url.search;
    }
    
    // Fallback to a CORS proxy service
    return `https://cors-anywhere.herokuapp.com/${originalUrl}`;
  }
  
  // In production, use the original URL
  return originalUrl;
};

// Create a dedicated axios instance for auth requests
const authApi = axios.create({
  baseURL: getProxiedUrl(API_URL),
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest' // Required by some CORS proxies
  }
});

// Add auth token to requests when available
authApi.interceptors.request.use(config => {
  const token = localStorage.getItem('idToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Define response interface with expanded type for the login response
export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: any;
  tokens?: {
    idToken: string;
    accessToken: string;
    refreshToken: string;
  };
  // For direct token returns
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  // For auth status
  needsConfirmation?: boolean;
  isSignUpComplete?: boolean;
  userId?: string;
  nextStep?: any;
  [key: string]: any;
}

// Update the login interface if needed
export interface LoginParams {
  username: string;
  password: string;
}

/**
 * Refresh the authentication tokens using the refresh token
 */
export const refreshToken = async (): Promise<AuthResponse> => {
  try {
    // Import the session persistence utilities
    const { getRefreshToken, storeAuthTokens } = await import('../utils/sessionPersistence');
    
    // Get refresh token with fallback strategy
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      return {
        success: false,
        message: 'No refresh token available'
      };
    }
    
    // Get username for token refresh with multiple fallback approaches
    let username = localStorage.getItem('auth_username');
    let userRole = localStorage.getItem('userRole') || null;
    
    // Log the starting point of our username extraction process
    // Get user role if available - important for CompanyAdmin handling
    if (!userRole) {
      try {
        const userDataStr = localStorage.getItem('userData') || localStorage.getItem('user');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          userRole = userData.role || userData['custom:role'] || userData.userRole || null;
          if (userRole) {
            localStorage.setItem('userRole', userRole);
          }
        }
      } catch (err) {
      }
    } else {
    }

    // If username is not in localStorage, try to extract it from the ID token
    if (!username) {
      try {
        const idToken = localStorage.getItem('idToken');
        if (idToken) {
          const tokenPayload = JSON.parse(atob(idToken.split('.')[1]));
          username = tokenPayload['cognito:username'] || tokenPayload.email || tokenPayload.sub;
          
          if (username) {
            // For Google SSO users, ensure the username has the 'google_' prefix
            if (username.includes('@') && !username.startsWith('google_')) {
              username = `google_${username}`;
            }
            
            // Store it for future use
            localStorage.setItem('auth_username', username);
            localStorage.setItem('token_username', username);
          }
        }
      } catch (err) {
      }
    }
    
    // Try other locations if still not found
    if (!username) {
      username = localStorage.getItem('cognito_username');
    }

    // Make sure we have a username for the token refresh
    if (!username) {
      return {
        success: false,
        message: 'No username available for token refresh'
      };
    }
    // Get the API endpoint
    const apiUrl = process.env.REACT_APP_API_URL || '';
    
    // Make token refresh request
    const response = await fetch(`${apiUrl}/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refreshToken,
        username,
        userRole
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || 'Failed to refresh token'
      };
    }

    const data = await response.json();
    
    // Store the new tokens
    if (data.tokens) {
      storeAuthTokens(
        data.tokens.idToken || null,
        data.tokens.refreshToken || null,
        data.tokens.accessToken || null,
        data.user || null
      );
    }

    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to refresh token'
    };
  }
};

/**
 * Login with username and password via API Gateway
 */
export const login = async (usernameOrParams: string | LoginParams, password?: string): Promise<AuthResponse> => {
  // Handle both parameter formats
  let username: string;
  let pwd: string;

  if (typeof usernameOrParams === 'object') {
    username = usernameOrParams.username;
    pwd = usernameOrParams.password;
  } else {
    username = usernameOrParams;
    pwd = password || '';
  }

  secureLogger.info('AuthService: Attempting login for user:', username);
  
  try {
    // Create the proper payload for API Gateway Lambda function
    const payload = {
      username: username,
      email: username,
      password: pwd
    };
    
    const apiGatewayUrl = `${API_URL}/login`;
    secureLogger.info('AuthService: Using API Gateway URL:', apiGatewayUrl);
    
    const response = await fetch(apiGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    secureLogger.info('AuthService: Login response status:', response.status);
    
    const rawText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(rawText);
      secureLogger.info('AuthService: Parsed response data:', { success: responseData.success });
      
      // Log authentication result
      secureLogger.info('AuthService: Logging authentication result');
      securityAuditLogger.logAuthentication(username, responseData.success, {
        status: responseData.success ? 'success' : 'failed',
        message: responseData.success ? 'Login successful' : (responseData.message || 'Login failed'),
        timestamp: new Date().toISOString(),
        statusCode: response.status,
        error: !responseData.success ? (responseData.error || 'Unknown error') : undefined
      });
      
      return responseData;
    } catch (parseError) {
      secureLogger.error('AuthService: Failed to parse response:', parseError);
      // Log failed authentication attempt
      securityAuditLogger.logAuthentication(username, false, {
        status: 'error',
        error: 'Invalid response format',
        statusCode: response.status,
        timestamp: new Date().toISOString(),
        rawResponse: rawText.substring(0, 100) // Log first 100 chars of raw response
      });
      throw new Error('Invalid response format from server');
    }
  } catch (error: any) {
    // Log any other errors during login
    secureLogger.error('AuthService: Login error:', error);
    securityAuditLogger.logAuthentication(username, false, {
      status: 'error',
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

/**
 * Create a new user account via API Gateway with Cognito fallback
 */
export const signup = async (
  username: string, 
  password: string, 
  attributes: Record<string, string>
): Promise<AuthResponse> => {
  try {
    
    // Create a clean attributes object with only standard Cognito attributes
    // that exactly match what the Lambda function expects
    const validAttributes: Record<string, string> = {
      // REQUIRED standard attributes based on Cognito schema
      email: attributes.email || '',
      name: attributes.name || attributes['name.formatted'] || username,
      phone_number: ''
    };
    
    // Format phone number if provided
    if (attributes.phone_number || attributes.phoneNumbers) {
      let phoneNum = (attributes.phone_number || attributes.phoneNumbers || '').replace(/\D/g, '');
      if (phoneNum.startsWith('0')) {
        phoneNum = '44' + phoneNum.substring(1);
      }
      if (!phoneNum.startsWith('44')) {
        phoneNum = '44' + phoneNum;
      }
      validAttributes.phone_number = '+' + phoneNum;
    } else {
      // Default phone number to satisfy Cognito schema requirement
      validAttributes.phone_number = '+15555555555';
    }
    
    // Add custom attributes
    if (attributes['custom:companyId']) {
      validAttributes['custom:companyId'] = attributes['custom:companyId'];
    }
    
    if (attributes['custom:userRole'] || attributes['custom:role']) {
      validAttributes['custom:userRole'] = attributes['custom:userRole'] || attributes['custom:role'];
    }
    
    // Create signup request payload with validated attributes
    const signupData = {
      username,
      password,
      attributes: validAttributes
    };
    
    
    try {
      // Use API URL from environment variables
      const apiUrl = process.env.REACT_APP_API_URL || API_URL;
      
      // Send signup request to the API with complete URL
      const response = await axios.post(`${apiUrl}/signup`, signupData);
      
      // Parse the response data if needed (API Gateway sometimes returns nested data)
      let userData = response.data;
      
      if (response.data.body && typeof response.data.body === 'string') {
        try {
          const parsedBody = JSON.parse(response.data.body);
          userData = parsedBody;
        } catch (parseError) {
        }
      }
      
      // FOCUSED UPDATE: Special handling for email exists even if API returns 200
      if (userData.type === 'EmailExistsException' ||
          (userData.message && (
            userData.message.toLowerCase().includes('email already exists') || 
            userData.message.toLowerCase().includes('account with email')
          ))) {
        return {
          success: false,
          message: userData.message || `An account with email '${attributes.email}' already exists.`,
          type: 'EmailExistsException',
          email: attributes.email
        };
      }
      
      // Extract userId and isSignUpComplete from the proper location
      const userId = userData.userId || (userData.user ? userData.user.id : null);
      const isSignUpComplete = userData.isSignUpComplete || false;
      const confirmationRequired = userData.confirmationRequired || true;
      
      return {
        success: true,
        userId: userId,
        isSignUpComplete: isSignUpComplete,
        needsConfirmation: confirmationRequired,
        message: userData.message || 'Signup successful',
        nextStep: { signUpStep: 'CONFIRM_SIGN_UP' }
      };
    } catch (apiError: any) {
      // FOCUSED UPDATE: Enhanced check for email exists in error response
      if (apiError.response?.data?.type === 'EmailExistsException' ||
          (apiError.response?.data?.message && (
            apiError.response.data.message.toLowerCase().includes('email already exists') ||
            apiError.response.data.message.toLowerCase().includes('account with email')
          ))) {
        return {
          success: false,
          message: apiError.response.data.message || `An account with email '${attributes.email}' already exists.`,
          type: 'EmailExistsException',
          email: attributes.email
        };
      }
      
      // Fall back to Cognito direct signup for any API error (404, network, etc.)
      if (apiError.message === 'Network Error' || 
          apiError.code === 'ERR_NETWORK' || 
          apiError.response?.status === 404) {
        
        // Use our dedicated Cognito service that properly handles SECRET_HASH
        const result = await cognitoService.cognitoSignUp(username, password, attributes);
        
        if (result.success) {
          return {
            success: true,
            userId: result.userId,
            isSignUpComplete: result.isSignUpComplete,
            message: result.message,
            nextStep: { signUpStep: 'CONFIRM_SIGN_UP' }
          };
        } else {
          // Throw the Cognito error
          throw new Error(result.message || 'Signup failed');
        }
      }
      
      // If not a network error or fallback failed, rethrow
      throw apiError;
    }
  } catch (error: any) {
    
    // FOCUSED UPDATE: Enhanced check for email exists in general error
    if (error.response?.data?.type === 'EmailExistsException' ||
        (error.response?.data?.message && (
          error.response?.data?.message.toLowerCase().includes('email already exists') ||
          error.response?.data?.message.toLowerCase().includes('account with email')
        ))) {
      return {
        success: false,
        message: error.response.data.message || `An account with email '${attributes.email}' already exists.`,
        type: 'EmailExistsException',
        email: attributes.email
      };
    }
    
    // Parse API Gateway error responses
    if (error.response?.data) {
      return {
        success: false,
        message: error.response.data.message || 'Signup failed',
        ...error.response.data
      };
    }
    
    // Handle network or unexpected errors
    return {
      success: false,
      message: error.message || 'Network error during signup',
      error
    };
  }
};

/**
 * Confirm user signup with verification code via API Gateway
 */
export const confirmSignup = async (
  username: string, 
  confirmationCode: string
): Promise<AuthResponse> => {
  try {
    
    try {
      // Fix the API endpoint URL to use environment variables
      const apiUrl = process.env.REACT_APP_API_ENDPOINT || process.env.REACT_APP_API_URL || API_URL;
      
      const response = await axios.post(`${apiUrl}/confirm-user`, {
        username,
        confirmationCode,
      });
      
      
      return {
        ...response.data,
        success: true
      };
    } catch (apiError: any) {
      // For CORS issues or 404, attempt direct Cognito confirmation
      if (apiError.message === 'Network Error' || 
          apiError.code === 'ERR_NETWORK' || 
          apiError.response?.status === 404) {
        
        // Try the alternate endpoint format
        try {
          const apiUrl = process.env.REACT_APP_API_ENDPOINT || process.env.REACT_APP_API_GATEWAY_URL || API_URL;
          
          const altResponse = await axios.post(`${apiUrl}/auth/confirm`, {
            username,
            confirmationCode
          });
          
          return {
            success: true,
            message: 'Account confirmed successfully'
          };
        } catch (altError) {
          // Fall back to direct Cognito confirmation
          const result = await cognitoService.cognitoConfirmSignUp(username, confirmationCode);
          if (result.success) {
            return {
              success: true,
              message: result.message
            };
          } else {
            throw new Error(result.message || 'Confirmation failed');
          }
        }
      }
      throw apiError;
    }
  } catch (error: any) {
    
    // Parse API Gateway error responses
    if (error.response?.data) {
      return {
        success: false,
        message: error.response.data.message || 'Confirmation failed',
        ...error.response.data
      };
    }
    
    // Handle network or unexpected errors
    return {
      success: false,
      message: error.message || 'Network error during confirmation',
      error
    };
  }
};

/**
 * Confirm user sign up with verification code
 * @param username The username to confirm
 * @param code The verification code received via email
 * @returns Result object with success status and message
 */
export const confirmSignUp = async (username: string, code: string) => {
  try {
    
    // Try to confirm using API Gateway
    const apiUrl = process.env.REACT_APP_API_ENDPOINT || process.env.REACT_APP_API_GATEWAY_URL || API_URL;
    const response = await axios.post(`${apiUrl}/auth/confirm`, {
      username: username,
      confirmationCode: code
    });
    
    
    if (response.status === 200) {
      return {
        success: true,
        message: 'Account confirmed successfully'
      };
    } else {
      return {
        success: false,
        message: response.data?.message || 'Failed to confirm account'
      };
    }
  } catch (error) {
    
    // Handle specific error cases
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || error.message;
      if (error.response?.status === 400 && errorMessage.includes('Invalid verification code')) {
        return {
          success: false,
          message: 'The verification code you entered is invalid. Please try again.'
        };
      }
      return {
        success: false,
        message: errorMessage
      };
    }
    
    // Default error case
    return {
      success: false,
      message: 'An error occurred during confirmation. Please try again.'
    };
  }
};

/**
 * Resend confirmation code via API Gateway
 */
export const resendConfirmationCode = async (username: string): Promise<AuthResponse> => {
  try {
    
    // NOTE: This endpoint might need adjustment based on actual API Gateway config
    // Since there's no specific endpoint in the OpenAPI, we'll use the confirm-user with a flag
    const response = await authApi.post('/confirm-user', {
      username,
      resendCode: true
    });
    
    return {
      ...response.data,
      success: true
    };
  } catch (error: any) {
    
    // Parse API Gateway error responses
    if (error.response?.data) {
      return {
        success: false,
        message: error.response.data.message || 'Failed to resend code',
        ...error.response.data
      };
    }
    
    // Handle network or unexpected errors
    return {
      success: false,
      message: error.message || 'Network error when resending code',
      error
    };
  }
};

/**
 * Check if the current authentication is valid
 * @returns Promise with auth status
 */
export const checkAuthentication = async () => {
  try {
    const token = localStorage.getItem('idToken');
    
    if (!token) {
      return { success: false, isAuthenticated: false, message: 'No token found' };
    }
    
    // Check if token is expired using tokenDebugger
    const { isTokenExpired, getTokenInfo } = await import('../utils/tokenDebugger');
    const tokenInfo = getTokenInfo(token);
    
    if (tokenInfo.isExpired) {
      const refreshResult = await refreshToken();
      return {
        success: refreshResult.success,
        isAuthenticated: refreshResult.success,
        message: refreshResult.success ? 'Token refreshed' : 'Token refresh failed'
      };
    }
    
    // Make a lightweight call to verify the token
    try {
      const response = await fetch(`${API_URL}/user-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        return { success: true, isAuthenticated: true };
      } else {
        const refreshResult = await refreshToken();
        return {
          success: refreshResult.success,
          isAuthenticated: refreshResult.success,
          message: refreshResult.success ? 'Token refreshed' : 'Token refresh failed'
        };
      }
    } catch (error) {
      return { success: false, isAuthenticated: false, error };
    }
  } catch (error) {
    return { success: false, isAuthenticated: false, error };
  }
};

/**
 * Get current user data via API Gateway
 */
export const getCurrentUser = async (): Promise<AuthResponse> => {
  try {
    // Get the ID token from storage
    const idToken = localStorage.getItem('idToken');
    
    if (!idToken) {
      throw new Error('No authentication token found');
    }
    
    // Make API request using token-based auth instead of username/password
    const response = await authApi.get('/user', {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });
    
    // Process the response
    let parsedData: any = response.data;
    if (response.data.body && typeof response.data.body === 'string') {
      try {
        parsedData = JSON.parse(response.data.body);
        
        // Ensure phone number field is normalized
        if (parsedData.user) {
          // Make sure PhoneNumber is properly copied to phoneNumber if needed
          if (parsedData.user.PhoneNumber && !parsedData.user.phoneNumber) {
            parsedData.user.phoneNumber = parsedData.user.PhoneNumber;
          } else if (parsedData.user.phoneNumber && !parsedData.user.PhoneNumber) {
            parsedData.user.PhoneNumber = parsedData.user.phoneNumber;
          }
        }
      } catch (parseError) {
      }
    }
    
    // Update user data in localStorage if present
    if (parsedData.user) {
      localStorage.setItem('user', JSON.stringify(parsedData.user));
    }
    
    return {
      success: true,
      user: parsedData.user,
      message: parsedData.message || 'User data retrieved successfully'
    };
  } catch (error: any) {
    // If token is expired, try refresh token flow instead of password reauth
    if (error.response?.status === 401) {
      try {
        // Try to use refresh token to get new tokens
        const refreshResult = await refreshToken();
        if (refreshResult.success) {
          // Retry the request with new token
          return getCurrentUser();
        }
      } catch (refreshError) {
        // Force new login if refresh fails
      }
    }
    
    // Try to get user from cache
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      return {
        success: true,
        user: JSON.parse(cachedUser),
        message: 'Using cached user data'
      };
    }
    
    // Return failure if no cached user
    return {
      success: false,
      message: 'Could not get user data',
      error
    };
  }
};

/**
 * Logout user via API Gateway
 */
export const logout = async (): Promise<AuthResponse> => {
  try {
    // Use the AuthManager to clear all tokens
    const authManager = await import('../utils/authManager');
    authManager.default.clearAllAuthTokens();
    
    // Clear Authorization header
    delete authApi.defaults.headers.common['Authorization'];
    
    return {
      success: true,
      message: 'Logout successful - all storage cleared'
    };
  } catch (error: any) {
    // Still try to clear essential tokens even if there was an error
    try {
      localStorage.removeItem('idToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (e) {
    }
    
    return {
      success: true, // Still return success since local logout succeeded
      message: 'Local logout successful, but there were some errors clearing all storage'
    };
  }
};

// Export all auth services
export default {
  login,
  signup,
  confirmSignup,
  confirmSignUp,
  resendConfirmationCode,
  checkAuthentication,
  getCurrentUser,
  logout,
  refreshToken,
};
