import axios from 'axios';
import { getApiEndpoint } from '../utils/cognitoUtils';
import cognitoService from './cognitoService';
import { API, getApiBaseUrl } from '../utils/apiUtils';
import { AUTH_ENDPOINTS, logEndpoint } from '../utils/endpoints';

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
    
    
    // Get username for SECRET_HASH calculation
    const username = localStorage.getItem('auth_username');
    
    if (!username) {
      return {
        success: false,
        message: 'Username required for token refresh'
      };
    }
    
    // Import the cognitoService to calculate SECRET_HASH
    const cognitoService = await import('./cognitoService');
    const secretHash = cognitoService.default.calculateSecretHash(username);
    
    // Call the refresh token endpoint with SECRET_HASH
    const response = await fetch(`${API_URL}/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        refreshToken,
        username, 
        secretHash 
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `Refresh failed: ${response.status} ${errorText}`
      };
    }
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      return {
        success: false,
        message: 'Invalid response format from server'
      };
    }
    
    // Handle nested response structure from API Gateway
    let parsedData: any = responseData;
    
    if (responseData.body && typeof responseData.body === 'string') {
      try {
        parsedData = JSON.parse(responseData.body);
      } catch (error) {
        return {
          success: false,
          message: 'Invalid response body format'
        };
      }
    }
    
    // If we have new tokens, store them using our persistence utility
    if (parsedData.tokens) {
      
      // Store tokens in both localStorage and sessionStorage
      storeAuthTokens(
        parsedData.tokens.idToken,
        parsedData.tokens.refreshToken,
        parsedData.tokens.accessToken
      );
      
      return {
        success: true,
        tokens: parsedData.tokens,
        message: 'Token refreshed successfully'
      };
    }
    
    return {
      success: false,
      message: 'Could not refresh token: No tokens in response'
    };
  } catch (error: any) {
    
    return {
      success: false,
      message: 'Token refresh failed due to an error',
      error
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
    // New format: single object parameter
    username = usernameOrParams.username;
    pwd = usernameOrParams.password;
  } else {
    // Old format: two separate parameters
    username = usernameOrParams;
    pwd = password || ''; // password should always be provided in old format
  }

  
  try {
    // Create the proper payload for API Gateway Lambda function
    // Important: Our Lambda function expects both email and username fields
    // Even though they can both be the same value
    const payload = {
      username: username,      // Keep as-is for backward compatibility
      email: username,         // Add email field with same value
      password: pwd
    };
    
    // Get the API Gateway endpoint
    const apiGatewayUrl = 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/login';
    
    // Make the API request
    const response = await fetch(apiGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    
    // Get the raw text response to help with debugging
    const rawText = await response.text();
    
    // Parse the response text
    let responseData;
    try {
      responseData = JSON.parse(rawText);
      
      // Handle the specific format from API Gateway which might include body-json
      if (responseData['body-json']) {
        responseData = responseData['body-json'];
      }
      
      // API Gateway sometimes wraps the response in a body property
      if (responseData.body && typeof responseData.body === 'string') {
        try {
          responseData = JSON.parse(responseData.body);
        } catch (parseError) {
        }
      }
      
    } catch (e) {
      return {
        success: false,
        message: 'Failed to parse server response'
      };
    }
    
    // CRITICAL: Check for error messages or unsuccessful responses
    if (responseData.error || 
        responseData.message?.includes('Incorrect username or password') || 
        responseData.message?.includes('Incorrect email or password') ||
        response.status === 401) {
      
      // Try alternate endpoint using email explicit format
      try {
        
        // Use the alternate login endpoint that explicitly handles email
        const altApiUrl = 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/email-login';
        
        const altResponse = await fetch(altApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            email: username,
            password: pwd
          })
        });
        
        if (altResponse.ok) {
          const altData = await altResponse.json();
          
          // Process the successful response from alt endpoint
          let idToken = null, accessToken = null, refreshToken = null, user = null;
          
          // Extract tokens and user data from altData
          if (altData.tokens) {
            idToken = altData.tokens.idToken;
            accessToken = altData.tokens.accessToken;
            refreshToken = altData.tokens.refreshToken;
          } else if (altData.AuthenticationResult) {
            idToken = altData.AuthenticationResult.IdToken;
            accessToken = altData.AuthenticationResult.AccessToken;
            refreshToken = altData.AuthenticationResult.RefreshToken;
          }
          
          user = altData.user || altData.User;
          
          // Store tokens in localStorage
          if (idToken) localStorage.setItem('idToken', idToken);
          if (accessToken) localStorage.setItem('accessToken', accessToken);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
          if (user) localStorage.setItem('userData', JSON.stringify(user));
          
          return {
            success: true,
            idToken,
            accessToken,
            refreshToken,
            user,
            message: 'Login successful via alternate endpoint'
          };
        }
      } catch (altError) {
      }
      
      return {
        success: false,
        message: responseData.message || 'Authentication failed'
      };
    }
    
    // Check for successful login
    if (response.status === 200 && responseData.success !== false) {
      // Extract tokens from response based on our API structure
      let idToken = null;
      let accessToken = null;
      let refreshToken = null;
      let user = null;
      
      // Extract from the Auth result format
      if (responseData.AuthenticationResult) {
        idToken = responseData.AuthenticationResult.IdToken;
        accessToken = responseData.AuthenticationResult.AccessToken;
        refreshToken = responseData.AuthenticationResult.RefreshToken;
      } 
      // Extract from our custom format
      else if (responseData.tokens) {
        idToken = responseData.tokens.idToken;
        accessToken = responseData.tokens.accessToken;
        refreshToken = responseData.tokens.refreshToken;
      }
      // Direct properties on the response
      else {
        idToken = responseData.idToken || responseData.IdToken;
        accessToken = responseData.accessToken || responseData.AccessToken;
        refreshToken = responseData.refreshToken || responseData.RefreshToken;
      }
      
      // IMPORTANT: Verify we actually have tokens
      if (!idToken && !accessToken) {
        console.warn('No tokens found in successful response');
        return {
          success: false,
          message: 'Authentication succeeded but no tokens were returned'
        };
      }
      
      // Extract user data from response
      user = responseData.user || responseData.User;
      
      // Store tokens in localStorage
      if (idToken) {
        localStorage.setItem('idToken', idToken);
      }
      
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      }
      
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      if (user) {
        localStorage.setItem('userData', JSON.stringify(user));
      }
      
      return {
        success: true,
        idToken,
        accessToken,
        refreshToken,
        user,
        message: 'Login successful'
      };
    } else {
      // Handle login failure
      const errorMessage = responseData.message || 'Login failed';
      
      return {
        success: false,
        message: errorMessage
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'An unexpected error occurred during login'
    };
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
      // Use direct API URL to ensure proper endpoint connection
      const apiUrl = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
      
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
      console.warn('API Gateway signup failed:', apiError.message);
      
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
      // Fix the API endpoint URL to use the full URL instead of relative path
      const apiUrl = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
      
      const response = await axios.post(`${apiUrl}/confirm-user`, {
        username,
        confirmationCode,
      });
      
      
      return {
        ...response.data,
        success: true
      };
    } catch (apiError: any) {
      console.warn('API Gateway confirmation failed, error:', apiError.message);
      
      // For CORS issues or 404, attempt direct Cognito confirmation
      if (apiError.message === 'Network Error' || 
          apiError.code === 'ERR_NETWORK' || 
          apiError.response?.status === 404) {
        
        // Try the alternate endpoint format
        try {
          const apiUrl = process.env.REACT_APP_API_GATEWAY_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
          
          const altResponse = await axios.post(`${apiUrl}/auth/confirm`, {
            username,
            confirmationCode
          });
          
          return {
            success: true,
            message: 'Account confirmed successfully'
          };
        } catch (altError) {
          console.warn('Alternate confirmation endpoint failed:', altError);
          
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
    const apiUrl = process.env.REACT_APP_API_GATEWAY_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
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
      const response = await fetch('https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/user-status', {
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
        const refreshed = await refreshToken();
        if (refreshed.success) {
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
    // Clear all auth-related data from localStorage
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_password');
    localStorage.removeItem('tokens');
    
    // Clear Authorization header
    delete authApi.defaults.headers.common['Authorization'];
    
    return {
      success: true,
      message: 'Logout successful'
    };
  } catch (error: any) {
    
    // Clear local storage even if there was an error
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_password');
    localStorage.removeItem('tokens');
    
    return {
      success: true, // Still return success since local logout succeeded
      message: 'Local logout successful, but server session may still be active'
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
