import { 
  signIn, 
  signOut, 
  signUp, 
  confirmSignUp, 
  resendSignUpCode, 
  getCurrentUser,
  fetchAuthSession
} from '@aws-amplify/auth';
import { getApiEndpoint } from '../utils/cognitoUtils';
import { API_BASE_URL, AUTH_ENDPOINTS } from '../utils/endpoints';

// Types for authentication methods
export interface SignUpData {
  username: string;
  password: string;
  email: string;
  companyId: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: any;
  userId?: string;
  message?: string;
  needsConfirmation?: boolean;
  username?: string;
  error?: any;
  isSignUpComplete?: boolean;
}

// Sign in with Cognito
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  try {
    console.log(`Attempting to sign in user: ${username}`);
    // Use direct API Gateway URL
    const apiUrl = API_BASE_URL;
    console.log(`Using API URL for login: ${apiUrl}`);
    
    const { isSignedIn, nextStep } = await signIn({ username, password });
    
    if (isSignedIn) {
      // Get user details if sign-in was successful
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      // Extract tokens from session for your app's use if needed
      const idToken = session.tokens?.idToken?.toString();
      const accessToken = session.tokens?.accessToken?.toString();
      
      // Optionally store tokens for API calls
      if (idToken) {
        localStorage.setItem('idToken', idToken);
      }
      
      return { 
        success: true, 
        user: currentUser,
        message: 'Login successful'
      };
    } else if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
      // User needs to confirm their account
      return { 
        success: false, 
        needsConfirmation: true, 
        username,
        message: 'Please confirm your account'
      };
    }
    
    return { 
      success: true, 
      message: 'Further authentication steps required' 
    };
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Handle specific Cognito errors
    if (error.name === 'UserNotConfirmedException') {
      return { 
        success: false, 
        needsConfirmation: true, 
        username,
        message: 'Please confirm your account'
      };
    }
    
    if (error.name === 'NotAuthorizedException') {
      return {
        success: false,
        message: 'Incorrect username or password'
      };
    }
    
    if (error.name === 'UserNotFoundException') {
      return {
        success: false,
        message: 'User does not exist'
      };
    }
    
    return {
      success: false,
      message: error.message || 'An error occurred during login',
      error
    };
  }
};

// Sign up with Cognito
export const signup = async (data: SignUpData): Promise<AuthResponse> => {
  try {
    console.log(`Attempting to sign up user: ${data.username}`);
    
    // Prepare user attributes
    const userAttributes: Record<string, string> = {
      email: data.email,
    };
    
    // Only add non-empty attributes
    if (data.companyId) {
      userAttributes['custom:companyId'] = data.companyId;
    }
    
    // Add optional attributes if they exist, ensuring phone number is in E.164 format
    if (data.phoneNumber) {
      // Ensure phone number is in E.164 format for Cognito
      let phoneNum = data.phoneNumber.replace(/\D/g, '');
      if (phoneNum.startsWith('0')) {
        phoneNum = '44' + phoneNum.substring(1);
      }
      if (!phoneNum.startsWith('44')) {
        phoneNum = '44' + phoneNum;
      }
      userAttributes.phone_number = '+' + phoneNum;
    }
    
    if (data.firstName) userAttributes.given_name = data.firstName;
    if (data.lastName) userAttributes.family_name = data.lastName;
    
    // Extract company name from email if not provided
    if (!userAttributes['custom:companyName'] && data.email) {
      const emailParts = data.email.split('@');
      if (emailParts.length > 1) {
        const domain = emailParts[1];
        const companyName = domain.split('.')[0];
        if (companyName) {
          userAttributes['custom:companyName'] = companyName;
        }
      }
    }
    
    const { isSignUpComplete, userId, nextStep } = await signUp({
      username: data.username,
      password: data.password,
      options: {
        userAttributes,
        autoSignIn: false
      }
    });
    
    return {
      success: true,
      userId,
      isSignUpComplete,
      needsConfirmation: nextStep?.signUpStep === 'CONFIRM_SIGN_UP',
      message: 'Sign-up successful. Please check your email for verification code.'
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    
    // Map common Cognito errors to user-friendly messages
    let errorMessage = error.message || 'An error occurred during sign up';
    
    if (error.name === 'InvalidParameterException' && error.message.includes('phone number format')) {
      errorMessage = 'Invalid phone number format. Please use a valid UK phone number (e.g., +44XXXXXXXXXX)';
    }
    
    return {
      success: false,
      message: errorMessage,
      error
    };
  }
};

// Confirm signup with verification code
export const confirmUserSignup = async (username: string, code: string): Promise<AuthResponse> => {
  try {
    console.log(`Confirming signup for user: ${username}`);
    
    // Validate the code format before sending to Cognito
    if (!code || !/^\d{6}$/.test(code.trim())) {
      return {
        success: false,
        message: 'Please enter a valid 6-digit verification code'
      };
    }
    
    const { isSignUpComplete } = await confirmSignUp({
      username,
      confirmationCode: code.trim()
    });
    
    return {
      success: isSignUpComplete,
      username,
      message: isSignUpComplete 
        ? 'Account confirmed successfully' 
        : 'There was an issue confirming your account'
    };
  } catch (error: any) {
    console.error('Confirmation error:', error);
    
    if (error.name === 'CodeMismatchException') {
      return {
        success: false,
        message: 'Invalid verification code'
      };
    }
    
    if (error.name === 'ExpiredCodeException') {
      return {
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      };
    }
    
    if (error.name === 'UserNotFoundException') {
      return {
        success: false,
        message: 'User not found. Please check your username or sign up again.'
      };
    }
    
    if (error.name === 'NotAuthorizedException' && error.message.includes('already confirmed')) {
      return {
        success: true,
        message: 'This account has already been confirmed. You can now log in.'
      };
    }
    
    return {
      success: false,
      message: error.message || 'An error occurred during confirmation',
      error
    };
  }
};

// Resend confirmation code
export const resendVerificationCode = async (username: string): Promise<AuthResponse> => {
  try {
    console.log(`Resending verification code for user: ${username}`);
    const { destination, deliveryMedium } = await resendSignUpCode({
      username
    });
    
    return {
      success: true,
      message: `Verification code sent to ${destination} via ${deliveryMedium}`
    };
  } catch (error: any) {
    console.error('Resend code error:', error);
    return {
      success: false,
      message: error.message || 'Failed to resend verification code',
      error
    };
  }
};

// Get current authenticated user with session
export const getAuthenticatedUser = async (): Promise<any> => {
  try {
    const currentUser = await getCurrentUser();
    const session = await fetchAuthSession();
    
    // Update tokens in localStorage if needed for API calls
    if (session.tokens?.idToken) {
      localStorage.setItem('idToken', session.tokens.idToken.toString());
    }
    
    return {
      user: currentUser,
      session,
      isAuthenticated: true
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return {
      user: null,
      session: null,
      isAuthenticated: false
    };
  }
};

// Sign out
export const logoutUser = async (): Promise<AuthResponse> => {
  try {
    await signOut();
    
    // Clear any stored tokens
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    
    return {
      success: true,
      message: 'Logout successful'
    };
  } catch (error: any) {
    console.error('Logout error:', error);
    return {
      success: false,
      message: error.message || 'An error occurred during logout',
      error
    };
  }
};

/**
 * Gets the authentication token from local storage
 * @returns The authentication token or null if not found
 */
export const getAuth = (): string | null => {
  // Try to get the token from various localStorage locations
  const idToken = localStorage.getItem('idToken');
  if (idToken) return idToken;
  
  const tokensStr = localStorage.getItem('tokens');
  if (tokensStr) {
    try {
      const tokens = JSON.parse(tokensStr);
      if (tokens.idToken) return tokens.idToken;
    } catch (e) {
      console.error('Error parsing tokens:', e);
    }
  }
  
  // Try other token formats
  const token = localStorage.getItem('token');
  if (token) return token;
  
  const authHeader = localStorage.getItem('authHeader');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
};

/**
 * Sets the auth token in localStorage
 * @param token The token to set
 */
export const setAuth = (token: string): void => {
  localStorage.setItem('idToken', token);
};

/**
 * Removes all auth tokens from localStorage
 */
export const clearAuth = (): void => {
  localStorage.removeItem('idToken');
  localStorage.removeItem('tokens');
  localStorage.removeItem('token');
  localStorage.removeItem('authHeader');
};
