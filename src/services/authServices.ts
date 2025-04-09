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

// Define response interface for better type safety
interface AuthResponse {
  success: boolean;
  message?: string;
  user?: any;
  tokens?: {
    idToken: string;
    accessToken: string;
    refreshToken: string;
  };
  needsConfirmation?: boolean;
  isSignUpComplete?: boolean;
  userId?: string;
  nextStep?: any;
  [key: string]: any;
}

/**
 * Refresh the authentication tokens using the refresh token
 */
export const refreshTokens = async (): Promise<AuthResponse> => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      return {
        success: false,
        message: 'No refresh token available'
      };
    }
    
    // Call the refresh token endpoint
    const response = await authApi.post('/refresh-token', {
      refreshToken
    });
    
    // Process response similar to login
    let parsedData: any = response.data;
    
    if (response.data.body && typeof response.data.body === 'string') {
      try {
        parsedData = JSON.parse(response.data.body);
      } catch (error) {
        console.error('Error parsing refresh token response:', error);
      }
    }
    
    // If we have new tokens, store them
    if (parsedData.tokens) {
      localStorage.setItem('idToken', parsedData.tokens.idToken);
      localStorage.setItem('accessToken', parsedData.tokens.accessToken);
      
      // Update auth header for subsequent requests
      authApi.defaults.headers.common['Authorization'] = `Bearer ${parsedData.tokens.idToken}`;
      
      return {
        success: true,
        tokens: parsedData.tokens,
        message: 'Token refreshed successfully'
      };
    }
    
    return {
      success: false,
      message: 'Could not refresh token'
    };
  } catch (error: any) {
    console.error('Token refresh error:', error);
    
    // On refresh failure, clear tokens to force re-login
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    return {
      success: false,
      message: 'Token refresh failed',
      error
    };
  }
};

/**
 * Login user via API Gateway with fallback to direct Cognito Auth
 */
export async function login(username: string, password: string): Promise<AuthResponse> {
  try {
    console.log('Attempting login for:', username, 'via API Gateway');
    
    // Prepare the request payload
    const requestPayload = {
      username,
      password
    };
    
    console.log('Login request payload:', {
      ...requestPayload,
      password: '********' // Hide password in logs
    });
    
    // Make API call to login endpoint
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });
    
    console.log('Login response status:', response.status);
    
    const responseText = await response.text();
    
    // Debug the raw response
    console.log('Raw response text:', responseText.substring(0, 100) + '...');
    
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
      console.log('Parsed response structure:', JSON.stringify({
        statusCode: responseData.statusCode,
        headers: responseData.headers ? 'present' : 'not present',
        bodyType: typeof responseData.body,
        bodyLength: responseData.body ? responseData.body.length : 0
      }));
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      console.log('Raw response:', responseText);
      throw new Error('Invalid response from server');
    }
    
    // Handle nested response structure from API Gateway
    if (responseData.body && typeof responseData.body === 'string') {
      try {
        const parsedBody = JSON.parse(responseData.body);
        console.log('Parsed response body structure:', Object.keys(parsedBody));
        
        // Check if login was successful based on the parsed body
        if (parsedBody.tokens && parsedBody.message === "Login successful") {
          // Store credentials securely in localStorage
          localStorage.setItem('auth_username', username);
          localStorage.setItem('auth_password', password);
        
          // Store tokens for authentication
          if (parsedBody.tokens) {
            console.log('Storing tokens in localStorage');
            localStorage.setItem('idToken', parsedBody.tokens.idToken || '');
            localStorage.setItem('accessToken', parsedBody.tokens.accessToken || '');
            localStorage.setItem('refreshToken', parsedBody.tokens.refreshToken || '');
            
            // Store full tokens object
            localStorage.setItem('tokens', JSON.stringify(parsedBody.tokens));
          }
          
          // Set auth header for subsequent requests
          const authHeader = `Basic ${btoa(`${username}:${password}`)}`;
          localStorage.setItem('authHeader', authHeader);
          console.log('Auth header set for subsequent requests');
          
          // Store user info
          if (parsedBody.user) {
            console.log('Storing user info in localStorage:', parsedBody.user);
            localStorage.setItem('user', JSON.stringify(parsedBody.user));
          }
          
          return {
            success: true,
            tokens: parsedBody.tokens,
            user: parsedBody.user,
            message: parsedBody.message || 'Login successful'
          };
        } else {
          // Handle login failure
          const errorMsg = parsedBody.message || 'Login failed';
          console.error('Login failed:', errorMsg);
          return {
            success: false,
            message: errorMsg
          };
        }
      } catch (bodyParseError) {
        console.error('Error parsing response body:', bodyParseError);
        throw new Error('Invalid response body from server');
      }
    }
    
    if (response.status === 200 && responseData && (responseData.tokens || responseData.success)) {
      // Store credentials securely in localStorage
      localStorage.setItem('auth_username', username);
      localStorage.setItem('auth_password', password);
    
      // Store tokens for authentication
      if (responseData.tokens) {
        console.log('Storing tokens in localStorage');
        localStorage.setItem('idToken', responseData.tokens.idToken || '');
        localStorage.setItem('accessToken', responseData.tokens.accessToken || '');
        localStorage.setItem('refreshToken', responseData.tokens.refreshToken || '');
        
        // Store full tokens object
        localStorage.setItem('tokens', JSON.stringify(responseData.tokens));
      }
      
      // Set auth header for subsequent requests
      const authHeader = `Basic ${btoa(`${username}:${password}`)}`;
      localStorage.setItem('authHeader', authHeader);
      console.log('Auth header set for subsequent requests');
      
      // Store user info
      if (responseData.user) {
        console.log('Storing user info in localStorage:', responseData.user);
        localStorage.setItem('user', JSON.stringify(responseData.user));
      }
      
      return {
        success: true,
        tokens: responseData.tokens,
        user: responseData.user,
        message: responseData.message || 'Login successful'
      };
    } else {
      // Handle login failure
      const errorMsg = responseData.message || 'Login failed';
      console.error('Login failed:', errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
  } catch (error: any) {
    console.error('Login error:', error);
    
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Login failed',
      error
    };
  }
}

/**
 * Create a new user account via API Gateway with Cognito fallback
 */
export const signup = async (
  username: string, 
  password: string, 
  attributes: Record<string, string>
): Promise<AuthResponse> => {
  try {
    console.log(`Attempting signup for: ${username} via API Gateway`);
    console.log('Signup attributes:', attributes);
    
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
    
    console.log('Sending signup request with attributes:', JSON.stringify(validAttributes, null, 2));
    
    try {
      // Use direct API URL to ensure proper endpoint connection
      const apiUrl = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
      
      // Send signup request to the API with complete URL
      const response = await axios.post(`${apiUrl}/signup`, signupData);
      
      // Log the complete response for debugging
      console.log('Signup API complete response:', {
        status: response.status,
        headers: response.headers,
        data: response.data
      });
      
      // Parse the response data if needed (API Gateway sometimes returns nested data)
      let userData = response.data;
      
      if (response.data.body && typeof response.data.body === 'string') {
        try {
          const parsedBody = JSON.parse(response.data.body);
          console.log('Parsed signup response body:', parsedBody);
          userData = parsedBody;
        } catch (parseError) {
          console.error('Error parsing signup response body:', parseError);
        }
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
      console.error('Signup error details:', {
        message: apiError.message,
        response: apiError.response ? {
          status: apiError.response.status,
          data: apiError.response.data
        } : 'No response'
      });
      
      // Fall back to Cognito direct signup for any API error (404, network, etc.)
      if (apiError.message === 'Network Error' || 
          apiError.code === 'ERR_NETWORK' || 
          apiError.response?.status === 404) {
        console.log('Attempting direct Cognito signup as fallback');
        
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
    console.error('Signup error:', error);
    
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
    console.log(`Confirming signup for: ${username} via API Gateway`);
    
    try {
      // Fix the API endpoint URL to use the full URL instead of relative path
      const apiUrl = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
      console.log(`Using confirmation endpoint: ${apiUrl}/confirm-user`);
      
      const response = await axios.post(`${apiUrl}/confirm-user`, {
        username,
        confirmationCode,
      });
      
      console.log('Confirmation API response:', response);
      
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
        console.log('Attempting direct Cognito confirmation as fallback');
        
        // Try the alternate endpoint format
        try {
          const apiUrl = process.env.REACT_APP_API_GATEWAY_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
          console.log(`Trying alternate confirmation endpoint: ${apiUrl}/auth/confirm`);
          
          const altResponse = await axios.post(`${apiUrl}/auth/confirm`, {
            username,
            confirmationCode
          });
          
          console.log('Alternate confirmation endpoint response:', altResponse);
          return {
            success: true,
            message: 'Account confirmed successfully'
          };
        } catch (altError) {
          console.warn('Alternate confirmation endpoint failed:', altError);
          
          // Fall back to direct Cognito confirmation
          console.log('Falling back to direct Cognito confirmation');
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
    console.error('Confirm signup error:', error);
    
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
    console.log(`Attempting to confirm signup for user: ${username}`);
    
    // Try to confirm using API Gateway
    const apiUrl = process.env.REACT_APP_API_GATEWAY_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
    const response = await axios.post(`${apiUrl}/auth/confirm`, {
      username: username,
      confirmationCode: code
    });
    
    console.log('Confirmation API response:', response);
    
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
    console.error('Error confirming signup:', error);
    
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
    console.log(`Resending confirmation code for: ${username} via API Gateway`);
    
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
    console.error('Resend code error:', error);
    
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
      console.log('Token is expired, attempting to refresh...');
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
        console.log('Token validation failed, attempting to refresh...');
        const refreshResult = await refreshToken();
        return {
          success: refreshResult.success,
          isAuthenticated: refreshResult.success,
          message: refreshResult.success ? 'Token refreshed' : 'Token refresh failed'
        };
      }
    } catch (error) {
      console.error('Error validating token with API:', error);
      return { success: false, isAuthenticated: false, error };
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
    return { success: false, isAuthenticated: false, error };
  }
};

/**
 * Attempt to refresh the authentication token
 * @returns Promise with refresh result
 */
export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      console.warn('No refresh token available');
      return { success: false, message: 'No refresh token available' };
    }
    console.log('Attempting to refresh token with API');
    const response = await fetch('https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) {
      console.warn('Token refresh failed:', response.status);
      return { success: false, message: `Token refresh failed: ${response.status}` };
    }
    
    const data = await response.json();
    if (data.success && data.idToken) {
      // Store the new tokens
      localStorage.setItem('idToken', data.idToken);
      sessionStorage.setItem('idToken', data.idToken); // Backup in sessionStorage
      
      console.log('Token refreshed successfully');
      return { success: true, message: 'Token refreshed successfully' };
    } else {
      console.warn('Invalid response from token refresh endpoint:', data);
      return { success: false, message: 'Invalid response from refresh endpoint' };
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return { success: false, message: 'Error refreshing token', error };
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
        console.log('Parsed user data from API:', parsedData);
        
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
        console.error('Error parsing response body:', parseError);
      }
    }
    
    // Update user data in localStorage if present
    if (parsedData.user) {
      localStorage.setItem('user', JSON.stringify(parsedData.user));
      console.log('Updated user data in localStorage from API response');
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
        const refreshed = await refreshTokens();
        if (refreshed.success) {
          // Retry the request with new token
          return getCurrentUser();
        }
      } catch (refreshError) {
        console.error('Refresh token error:', refreshError);
        // Force new login if refresh fails
      }
    }
    console.error('Get user error:', error);
    
    // Try to get user from cache
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      console.log('Using cached user data from localStorage');
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
    console.error('Logout error:', error);
    
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
  refreshTokens,
};
