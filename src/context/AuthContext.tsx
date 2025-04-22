import React, { createContext, useState, useEffect, useContext } from 'react';
import * as authService from '../services/authServices';
import { isAdminFromToken } from '../utils/adminUtils';
import { AuthContextType } from '../types/auth';
import { 
  storeAuthTokens, 
  getAuthToken, 
  getRefreshToken, 
  clearAuthData, 
  needsSessionRefresh,
  getStoredUserData,
  isAuthenticated as checkIsAuthenticated,
  initializeSession
} from '../utils/sessionPersistence';
import { debugAuthState } from '../utils/tokenDebugger';
import sessionManager from '../utils/sessionManager';

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  isAdmin: false,
  userRole: 'User',
  login: async () => ({}),
  signup: async () => ({}),
  logout: async () => {},
  checkAuth: async () => {},
  confirmUser: async () => ({}),
  resendConfirmationCode: async () => ({}),
  signIn: async () => ({}),
  signUp: async () => ({}),
  confirmSignUp: async () => ({}),
  checkAdminStatus: async () => false
});

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{ message: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('User');

  // Check for existing authentication on component mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        console.log('🔄 Initializing auth state...');
        
        // Use our new initializeSession function to check stored credentials
        const { isAuthenticated: hasValidToken, userData, token } = initializeSession();
        
        // If we have a valid token and user data, set auth state
        if (hasValidToken && userData) {
          console.log('✅ Found valid authentication session');
          setUser(userData);
          setIsAuthenticated(true);
          
          // Also check for admin status if we have a valid session
          const adminStatus = await checkAdminStatus();
          console.log('Admin status:', adminStatus ? 'Administrator' : 'Regular user');
          
          return;
        }
        
        // If we have a token but no user data, or token is expired
        if (token) {
          console.log('🔄 Found token but needs validation/refresh');
          
          // Try to refresh the token first
          try {
            const refreshResult = await authService.refreshToken();
            
            if (refreshResult.success) {
              console.log('✅ Successfully refreshed token');
              
              // Now try to get user info with the refreshed token
              try {
                const userResponse = await authService.getCurrentUser();
                if (userResponse.success && userResponse.user) {
                  console.log('✅ Retrieved user data after token refresh');
                  setUser(userResponse.user);
                  setIsAuthenticated(true);
                  storeAuthTokens(null, null, null, userResponse.user);
                  
                  // Also start the session manager heartbeat
                  sessionManager.storeUserData(userResponse.user);
                  
                  return;
                }
              } catch (userError) {
                console.warn('⚠️ Could not get user data after token refresh:', userError);
              }
            } else {
              console.warn('⚠️ Token refresh failed:', refreshResult.message);
            }
          } catch (refreshError) {
            console.error('❌ Error during token refresh at init:', refreshError);
          }
        }
        
        // First check localStorage for user data
        const savedUserStr = localStorage.getItem('user');
        const idToken = localStorage.getItem('idToken');

        if (savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            setUser(savedUser);

            // Make sure token is available in localStorage
            if (idToken) {
              // Also set it in sessionStorage as a backup
              sessionStorage.setItem('idToken', idToken);
              setIsAuthenticated(true);
            }

            console.log('Auth initialized from localStorage');
          } catch (e) {
            console.error('Error parsing saved user data:', e);
          }
        } else if (idToken) {
          // We have a token but no user, try to fetch user info
          try {
            // Call your API to verify token and get user info
            const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/me`, {
              headers: {
                'Authorization': `Bearer ${idToken}`
              }
            });

            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
              setIsAuthenticated(true);
              localStorage.setItem('user', JSON.stringify(userData));
              console.log('Auth initialized from token verification');
            }
          } catch (e) {
            console.error('Error verifying token:', e);
            // Keep the token but couldn't get user info
          }
        }
      } catch (e) {
        console.error('Error initializing auth:', e);
        setError({ message: 'Failed to initialize authentication' });
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Load persisted auth state on mount
  useEffect(() => {
    const loadAuthState = async () => {
      const idToken = localStorage.getItem('idToken');
      const userData = localStorage.getItem('userData');
      
      if (idToken && userData) {
        try {
          const user = JSON.parse(userData);
          setUser(user);
          setIsAuthenticated(true);
          console.log("Restored authenticated user from localStorage:", user);
        } catch (e) {
          console.error("Failed to parse userData from localStorage:", e);
          // Clear potentially corrupted data
          localStorage.removeItem('userData');
        }
      }
    };
    
    loadAuthState();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (isAuthenticated) {
      // Set up a timer to check token validity every 5 minutes
      const tokenCheckInterval = setInterval(async () => {
        try {
          console.log('Performing scheduled token check');
          const result = await authService.checkAuthentication();
          
          if (!result.success || !result.isAuthenticated) {
            console.warn('Token validation failed during scheduled check');
            setUser(null);
            setIsAuthenticated(false);
            
            // Clear invalid tokens
            localStorage.removeItem('idToken');
            sessionStorage.removeItem('idToken');
            
            // Redirect to login page
            setTimeout(() => {
              window.location.href = '/login';
            }, 500);
          }
        } catch (err) {
          console.error('Error during scheduled token check:', err);
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => {
        clearInterval(tokenCheckInterval);
      };
    }
  }, [isAuthenticated]);

  // Check if user is already authenticated
  const checkAuth = async () => {
    setLoading(true);
    try {
      // Debug current auth state
      debugAuthState();
      
      // Check if we have a stored token using our enhanced utility
      const token = getAuthToken();
      
      if (!token) {
        console.warn('No token found in storage');
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
        setLoading(false);
        return;
      }
      
      console.log('Token found, checking validity...');
      
      // If token needs refresh, do it proactively
      if (needsSessionRefresh()) {
        console.log('Token needs refreshing, doing so proactively...');
        try {
          // Use sessionManager for token refresh for better consistency
          const refreshSuccess = await sessionManager.forceTokenRefresh();
          if (!refreshSuccess) {
            console.warn('Proactive token refresh failed');
            // Continue with the old token for now, we'll try to use it
          } else {
            console.log('Proactive token refresh succeeded');
          }
        } catch (refreshError) {
          console.error('Error during proactive token refresh:', refreshError);
          // Continue with existing token
        }
      }
      
      // Check authentication status
      const result = await authService.checkAuthentication();

      if (result.success && result.isAuthenticated) {
        // Get or use cached user data
        let userData;
        try {
          const userResponse = await authService.getCurrentUser();
          userData = userResponse.user;
          
          // Update stored user data in both localStorage and sessionStorage
          if (userData) {
            storeAuthTokens(null, null, null, userData);
            
            // Also update the sessionManager
            sessionManager.storeUserData(userData);
          }
        } catch (userError) {
          console.warn('Could not get fresh user data:', userError);
          // If we can't get fresh user data, try to use cached data
          userData = getStoredUserData();
        }

        setUser(userData);
        setIsAuthenticated(true);
        console.log('Authentication successful');
      } else {
        console.warn('Authentication check failed:', result);
        
        // Try one last refresh before giving up
        try {
          console.log('Attempting emergency token refresh...');
          const refreshSuccess = await sessionManager.forceTokenRefresh();
          
          if (refreshSuccess) {
            console.log('Emergency refresh successful, rechecking auth...');
            const recheckResult = await authService.checkAuthentication();
            
            if (recheckResult.success && recheckResult.isAuthenticated) {
              // Get or use cached user data after successful refresh
              let userData = getStoredUserData();
              
              try {
                const userResponse = await authService.getCurrentUser();
                userData = userResponse.user;
                
                if (userData) {
                  storeAuthTokens(null, null, null, userData);
                  sessionManager.storeUserData(userData);
                }
              } catch (userError) {
                console.warn('Could not get fresh user data after refresh:', userError);
              }
              
              setUser(userData);
              setIsAuthenticated(true);
              setError(null);
              setLoading(false);
              return;
            }
          }
        } catch (emergencyRefreshError) {
          console.error('Emergency token refresh failed:', emergencyRefreshError);
        }
        
        setUser(null);
        setIsAuthenticated(false);
        
        // Clear invalid tokens using our comprehensive clearAuthData function
        clearAuthData();
      }
      setError(null);
    } catch (err: any) {
      console.error('Authentication check error:', err);
      setUser(null);
      setIsAuthenticated(false);

      if (err.message === 'No authentication token found' ||
        err.message === 'Invalid or expired authentication') {
        // This is an expected state, don't show error
        setError(null);
        
        // Clear invalid tokens
        clearAuthData();
      } else {
        setError({ message: err.message || 'Failed to check authentication status' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Add this function to check admin status
  const checkAdminStatus = async (): Promise<boolean> => {
    try {
      const idToken = localStorage.getItem('idToken');
      if (idToken) {
        // First try client-side check
        const adminFromToken = isAdminFromToken(idToken);
        if (adminFromToken) {
          setIsAdmin(true);
          setUserRole('Admin');
          localStorage.setItem('isAdmin', 'true');
          return true;
        }
      }
      
      // Check user data from local storage
      const userDataStr = localStorage.getItem('userData') || localStorage.getItem('user');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          if (userData && userData.role && userData.role.toLowerCase().includes('admin')) {
            console.log('Found admin role in user data:', userData.role);
            setIsAdmin(true);
            setUserRole('Admin');
            localStorage.setItem('isAdmin', 'true');
            return true;
          }
        } catch (e) {
          console.error('Error parsing user data during admin check:', e);
        }
      }
      
      // If client check fails, verify with API
      const token = localStorage.getItem('accessToken') || localStorage.getItem('idToken');
      if (!token) return false;
      
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/admin`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) return false;
        
        const data = await response.json();
        const hasAdminRole = data.isAdmin === true;
        
        console.log('Admin API check result:', hasAdminRole);
        setIsAdmin(hasAdminRole);
        setUserRole(hasAdminRole ? 'Admin' : 'User');
        
        if (hasAdminRole) {
          localStorage.setItem('isAdmin', 'true');
        }
        
        return hasAdminRole;
      } catch (apiError) {
        console.error('API admin check failed:', apiError);
        return false;
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  // Add this to the useEffect for automatic admin status check
  useEffect(() => {
    // Also check admin status if the user is authenticated
    if (isAuthenticated) {
      checkAdminStatus().then(isAdmin => {
        if (isAdmin) {
          console.log('User confirmed as administrator');
          // We could add auto-redirect logic here, but it's better to handle in components
        }
      });
    }
  }, [isAuthenticated]);

  // Login method - uses API Gateway
  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Logging in user:', username);

      // Ensure username and password are strings
      const sanitizedUsername = String(username).trim();
      const sanitizedPassword = String(password);

      if (!sanitizedUsername || !sanitizedPassword) {
        setError({ message: 'Username and password are required' });
        throw new Error('Username and password are required');
      }

      // Call the service with the sanitized credentials
      const response = await authService.login(sanitizedUsername, sanitizedPassword);
      console.log('Login response received:', response);

      // CRITICAL: Check if login was actually successful
      if (!response.success) {
        // Set error message from the response
        setError({ message: response.message || 'Login failed' });
        setIsAuthenticated(false);
        setUser(null);
        throw new Error(response.message || 'Login failed');
      }

      // IMPORTANT: Only proceed with these steps if login was successful
      if (response.success) {
        // Save the AWS config data
        const awsConfig = {
          region: process.env.REACT_APP_AWS_REGION || 'eu-north-1',
          userPoolId: process.env.REACT_APP_USER_POOL_ID || 'eu-north-1_gejWyB4ZB',
          userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || 're4qc69mpbck8uf69jd53oqpa'
        };

        // Save AWS config to localStorage
        localStorage.setItem('awsConfig', JSON.stringify(awsConfig));
        console.log('AWS config saved to localStorage:', awsConfig);
        
        // Store username and password in localStorage for Basic Authentication
        // This is crucial for operations that require Basic Auth like PUT requests
        localStorage.setItem('auth_username', sanitizedUsername);
        localStorage.setItem('auth_password', sanitizedPassword);
        console.log('Stored authentication credentials for Basic Auth');

        // Save user data to localStorage (should already be saved in authService.login)
        if (response.user) {
          // Use sessionManager to store user data for better cross-tab synchronization
          sessionManager.storeUserData(response.user);
          console.log('User data saved via sessionManager:', response.user);
          setUser(response.user);
        } else {
          console.warn('No user data received from login response');

          // Try to get user data if not provided in the login response
          try {
            const userResponse = await authService.getCurrentUser();
            if (userResponse.success && userResponse.user) {
              setUser(userResponse.user);
              // Use sessionManager to store user data
              sessionManager.storeUserData(userResponse.user);
              console.log('User data retrieved and saved via sessionManager');
            }
          } catch (userError) {
            console.warn('Failed to fetch user data after login:', userError);
          }
        }

        // Save tokens using sessionManager
        if (response.tokens) {
          sessionManager.storeTokens(response.tokens);
          console.log('Tokens saved via sessionManager:', {
            idToken: response.tokens.idToken ? `${response.tokens.idToken.substring(0, 15)}...` : null,
            accessToken: response.tokens.accessToken ? 'Present' : null,
            refreshToken: response.tokens.refreshToken ? 'Present' : null
          });
          setIsAuthenticated(true);
        } else {
          console.warn('No tokens received from login response');
          // Check if we have tokens in localStorage that might have been set by the service
          const idToken = localStorage.getItem('idToken');
          if (idToken) {
            console.log('Found token in localStorage, setting authenticated state');
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            throw new Error('No authentication tokens received');
          }
        }

        // Make sure to store the token in localStorage
        if (response.idToken) {
          // Use storeAuthTokens for better cross-storage consistency
          storeAuthTokens(response.idToken, null, null);
        }

        // After successful authentication, check for admin status
        const isUserAdmin = await checkAdminStatus();

        // You might want to update user object to include admin status
        if (response.user) {
          const updatedUser = {
            ...response.user,
            isAdmin: isUserAdmin,
            role: isUserAdmin ? 'Admin' : 'User'
          };
          setUser(updatedUser);
          
          // Also update in storage
          sessionManager.storeUserData(updatedUser);
        }

        return { success: true, user: response.user, isAdmin: isUserAdmin };
      }

      // If we somehow get here, it's an error
      throw new Error(response.message || 'Login failed');
    } catch (err: any) {
      console.error('Login error:', err);

      // More robust error handling
      if (err.needsConfirmation) {
        setError({ message: 'Please confirm your account' });
        return {
          success: false,
          needsConfirmation: true,
          username
        };
      }

      // Handle network errors specifically
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        setError({
          message: 'Network error: Cannot connect to authentication service. ' +
            'Please check your internet connection and try again.'
        });
      } else {
        setError({ message: err.message || 'Login failed' });
      }

      setIsAuthenticated(false);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Handle sign in
  const signIn = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Attempting to sign in user: ${username}`);
      
      // Use the updated authService that points directly to API Gateway
      const response = await authService.login(username, password);
      console.log('Login result:', response);
      
      if (response.success) {
        // Store username and password in localStorage for Basic Authentication
        // This is crucial for operations that require Basic Auth like PUT requests
        localStorage.setItem('auth_username', username);
        localStorage.setItem('auth_password', password);
        console.log('Stored authentication credentials for Basic Auth in signIn');
        
        // If we have user data, store it and set authenticated
        if (response.user) {
          setUser(response.user);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
        
        setIsAuthenticated(true);
        // Check for admin status
        await checkAdminStatus();
      }
      
      return response;
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during sign in');
      return {
        success: false,
        error: true,
        message: err.message || 'An unexpected error occurred'
      };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username: string, password: string, email: string, companyId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Create attributes object with email and companyId
      const attributes = {
        email,
        'custom:companyId': companyId,
      };

      const result = await authService.signup(username, password, attributes);

      if (!result.success) {
        throw new Error(result.message || 'Signup failed');
      }

      return {
        isSignUpComplete: result.isSignUpComplete,
        userId: result.userId,
        nextStep: result.nextStep,
        username
      };
    } catch (err: any) {
      setError({ message: err.message || 'Signup failed' });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (username: string, password: string, attributes: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Signing up user:', username);

      // Ensure API URLs are properly defined
      if (!process.env.REACT_APP_API_URL) {
        console.warn('REACT_APP_API_URL environment variable is not defined. Using fallback URL.');
      }

      // Try using our authService directly first, with better error handling
      try {
        console.log('Attempting signup via authService');
        const result = await authService.signup(username, password, attributes);
        
        console.log('Complete signup result from service:', result);

        if (!result.success) {
          throw new Error(result.message || 'Signup failed');
        }

        // Store username for confirmation
        localStorage.setItem('pendingConfirmation', username);
        localStorage.setItem('signupEmail', attributes.email || '');

        return {
          success: true,
          isSignUpComplete: result.isSignUpComplete || false,
          userId: result.userId || null,
          nextStep: result.nextStep || { signUpStep: 'CONFIRM_SIGN_UP' },
          username
        };
      } catch (serviceError: any) {
        console.error('authService signup failed:', serviceError);
        
        // Return structured error response for the UI
        if (serviceError.response?.status === 404) {
          console.log('API returned 404, attempting direct Cognito signup');
          // Try direct Cognito signup via service (the service handles this internally)
          const fallbackResult = await authService.signup(username, password, attributes);
          
          if (fallbackResult.success) {
            localStorage.setItem('pendingConfirmation', username);
            localStorage.setItem('signupEmail', attributes.email || '');
            
            return {
              success: true,
              isSignUpComplete: fallbackResult.isSignUpComplete || false,
              userId: fallbackResult.userId || null,
              nextStep: fallbackResult.nextStep || { signUpStep: 'CONFIRM_SIGN_UP' },
              username
            };
          }
        }
        
        // Re-throw so the error is caught by the outer catch block
        throw serviceError;
      }
    } catch (err: any) {
      console.error('Error during signup:', err);
      setError({ message: err.message || 'Signup failed' });
      
      // Return a structured error response that can be handled by the UI
      return {
        success: false,
        message: err.message || 'An unexpected error occurred during signup',
        error: err
      };
    } finally {
      setLoading(false);
    }
  };

  const confirmUser = async (username: string, code: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.confirmSignup(username, code);

      if (!result.success) {
        throw new Error(result.message || 'Confirmation failed');
      }

      return result;
    } catch (err: any) {
      setError({ message: err.message || 'Confirmation failed' });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmSignUp = confirmUser;

  const resendConfirmationCode = async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.resendConfirmationCode(username);

      if (!result.success) {
        throw new Error(result.message || 'Failed to resend code');
      }

      return result;
    } catch (err: any) {
      setError({ message: err.message || 'Failed to resend code' });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Stop the session manager heartbeat
      sessionManager.stopHeartbeat();
      
      // Clear data from session manager
      sessionManager.clearSession();
      
      // Clear Basic Auth credentials
      localStorage.removeItem('auth_username');
      localStorage.removeItem('auth_password');
      
      // Call the auth service logout
      await authService.logout();
      
      setUser(null);
      setIsAuthenticated(false);
      
      // Use window.location instead of navigate
      window.location.href = '/login';
    } catch (err: any) {
      setError({ message: err.message || 'Logout failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      isAuthenticated,
      isAdmin,
      userRole,
      login,
      signup,
      logout,
      checkAuth,
      confirmUser,
      resendConfirmationCode,
      signIn,
      signUp,
      confirmSignUp,
      checkAdminStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the context for direct imports
export { AuthContext };