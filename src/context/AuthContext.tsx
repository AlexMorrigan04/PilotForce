import React, { createContext, useState, useEffect } from 'react';
import * as authService from '../services/authServices';
import { isAdminFromToken } from '../utils/adminUtils';

// Define the shape of our auth context
interface AuthContextType {
  user: any | null;
  loading: boolean;
  error: { message: string } | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userRole: string;
  login: (username: string, password: string) => Promise<any>;
  signup: (username: string, password: string, email: string, companyId: string) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  confirmUser: (username: string, code: string) => Promise<any>;
  resendConfirmationCode: (username: string) => Promise<any>;
  signIn: (username: string, password: string) => Promise<any>;
  signUp: (username: string, password: string, attributes: Record<string, string>) => Promise<any>;
  confirmSignUp: (username: string, code: string) => Promise<any>;
  checkAdminStatus: () => Promise<boolean>;
}

// Create the context with default values
export const AuthContext = createContext<AuthContextType>({
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
            }

            console.log('Auth initialized from localStorage');
          } catch (e) {
            console.error('Error parsing saved user data:', e);
          }
        } else if (idToken) {
          // We have a token but no user, try to fetch user info
          try {
            // Call your API to verify token and get user info
            const response = await fetch('https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/auth/me', {
              headers: {
                'Authorization': `Bearer ${idToken}`
              }
            });

            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
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
      // Get token from storage
      const token = localStorage.getItem('idToken');
      
      if (!token) {
        console.warn('No token found in localStorage');
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
        setLoading(false);
        return;
      }
      
      console.log('Token found, checking validity...');
      
      // Check authentication status
      const result = await authService.checkAuthentication();

      if (result.success && result.isAuthenticated) {
        // Get or use cached user data
        let userData;
        try {
          const userResponse = await authService.getCurrentUser();
          userData = userResponse.user;
          
          // Update stored user data
          if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } catch (userError) {
          console.warn('Could not get fresh user data:', userError);
          // If we can't get fresh user data, try to use cached data
          const cachedUserData = localStorage.getItem('user');
          if (cachedUserData) {
            userData = JSON.parse(cachedUserData);
          }
        }

        setUser(userData);
        setIsAuthenticated(true);
        console.log('Authentication successful');
      } else {
        console.warn('Authentication check failed:', result);
        setUser(null);
        setIsAuthenticated(false);
        
        // Clear invalid tokens
        localStorage.removeItem('idToken');
        sessionStorage.removeItem('idToken');
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
        localStorage.removeItem('idToken');
        sessionStorage.removeItem('idToken'); 
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
          return true;
        }
      }
      
      // If client check fails, verify with API
      const token = localStorage.getItem('accessToken') || localStorage.getItem('idToken');
      if (!token) return false;
      
      const response = await fetch('https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/admin', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) return false;
      
      const data = await response.json();
      const hasAdminRole = data.isAdmin === true;
      
      setIsAdmin(hasAdminRole);
      setUserRole(hasAdminRole ? 'Admin' : 'User');
      return hasAdminRole;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  // Add this to the useEffect for automatic admin status check
  useEffect(() => {
    // Also check admin status if the user is authenticated
    if (isAuthenticated) {
      checkAdminStatus();
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

        // Save user data to localStorage (should already be saved in authService.login)
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          console.log('User data saved to localStorage:', response.user);
          setUser(response.user);
        } else {
          console.warn('No user data received from login response');

          // Try to get user data if not provided in the login response
          try {
            const userResponse = await authService.getCurrentUser();
            if (userResponse.success && userResponse.user) {
              setUser(userResponse.user);
              localStorage.setItem('user', JSON.stringify(userResponse.user));
              console.log('User data retrieved and saved to localStorage');
            }
          } catch (userError) {
            console.warn('Failed to fetch user data after login:', userError);
          }
        }

        // Save tokens to localStorage (should already be saved in authService.login)
        if (response.tokens) {
          localStorage.setItem('tokens', JSON.stringify(response.tokens));
          console.log('Tokens saved to localStorage:', {
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
          localStorage.setItem('idToken', response.idToken);
          sessionStorage.setItem('idToken', response.idToken); // Backup in sessionStorage
        }

        // After successful authentication, check for admin status
        const isUserAdmin = await checkAdminStatus();

        // You might want to update user object to include admin status
        if (response.user) {
          setUser({
            ...response.user,
            isAdmin: isUserAdmin,
            role: isUserAdmin ? 'Admin' : 'User'
          });
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

  const signIn = login;

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

      const result = await authService.signup(username, password, attributes);

      // More verbose logging of the complete signup result
      console.log('Complete signup result from service:', result);

      if (!result.success) {
        throw new Error(result.message || 'Signup failed');
      }

      // Store username for confirmation
      localStorage.setItem('pendingConfirmation', username);

      return {
        success: true,
        isSignUpComplete: result.isSignUpComplete || false,
        userId: result.userId || null,
        nextStep: result.nextStep || { signUpStep: 'CONFIRM_SIGN_UP' },
        username
      };
    } catch (err: any) {
      console.error('Error during signup:', err);
      setError({ message: err.message || 'Signup failed' });
      throw err;
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

// Custom hook to use the auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};