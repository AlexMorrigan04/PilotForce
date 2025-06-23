import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Amplify } from 'aws-amplify';
import { jwtDecode } from 'jwt-decode'; // Change from default import to named import
import authService from '../services/authServices';
import sessionManager from '../utils/sessionManager';
import authManager from '../utils/authManager';
// We'll use authUtils default export instead
import authUtils from '../utils/authUtils'; 
import debugTokens from '../utils/debugTokens'; // Import the debug utilities
import { storeAuthTokens } from '../utils/sessionPersistence';
import urlUtils from '../utils/urlUtils';
import { securityAuditLogger } from '../utils/securityAuditLogger';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  companyId: string;
  role: string;
  sub?: string;
  phoneNumber?: string;
  username?: string;
  
  accessPassword?: string;
  tokens?: {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  idToken?: string;
  accessToken?: string;
  companyName?: string;
  userId?: string;
  
  ['custom:userRole']?: string;
  ['custom:role']?: string;
  ['custom:companyId']?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: AuthUser | null;
  error: string | null;
  login: (usernameOrParams: string | { username: string; password: string }, password?: string) => Promise<any>;
  logout: () => void;
  initiateGoogleLogin: () => Promise<boolean>;
  initiateMicrosoftLogin: () => Promise<boolean>;
  processOAuthCallback: (code: string, inviteCode?: string, provider?: 'google' | 'microsoft') => Promise<any>;
  refreshToken: () => Promise<boolean>;
  isAdmin?: boolean;
  
  checkAuth?: () => Promise<boolean>;
  confirmUser?: (username: string, code: string) => Promise<any>;
  resendConfirmationCode?: (username: string) => Promise<any>;
  confirmSignUp?: (username: string, code: string) => Promise<any>;
  handleGoogleRedirect?: () => Promise<any>;
  handleMicrosoftRedirect?: () => Promise<any>;
  handleOAuthCallback?: (code: string, state?: string, provider?: 'google' | 'microsoft') => Promise<any>;
  signUp?: (userData: any) => Promise<any>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure Amplify from environment variables
const configureAmplify = () => {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
        userPoolClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '',
        loginWith: {
          email: true,
          username: true
        }
      }
    },
    API: {
      REST: {
        pilotforce: {
          endpoint: process.env.REACT_APP_API_URL || process.env.REACT_APP_API_ENDPOINT || '',
          region: process.env.REACT_APP_AWS_REGION || 'eu-north-1',
        }
      }
    }
  });
};

// Invoke configuration
configureAmplify();

// Utility to extract and store Cognito user details from idToken
const saveCognitoUserDetailsFromIdToken = (idToken: string | null) => {
  if (!idToken) return;
  try {
    const decoded: any = jwtDecode(idToken); // This now uses the named import
    const userDetails = {
      email: decoded.email || 'No email found',
      name: decoded.name || decoded['cognito:username'] || 'No name found',
      groups: decoded['cognito:groups'] || [],
      role: decoded.role || decoded['custom:role'] || decoded['custom:userRole'] || 'No role found',
      sub: decoded.sub || 'No user ID found',
      isAdmin: false,
      fullToken: decoded
    };
    
    // Only treat 'Administrator' or 'Admin' as admin roles - NOT 'CompanyAdmin'
    // Using exact matches to prevent substring matching issues
    userDetails.isAdmin = userDetails.groups.includes('Administrators') ||
      userDetails.groups.includes('Administrator') ||
      (userDetails.role && 
       (userDetails.role.toLowerCase() === 'administrator' || 
        userDetails.role.toLowerCase() === 'admin'));
    localStorage.setItem('userCognitoDetails', JSON.stringify(userDetails));
    sessionStorage.setItem('userCognitoDetails', JSON.stringify(userDetails));
  } catch (error) {
    // Silent fail
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);  // Changed from Error to string | null
  
  // Store processed OAuth codes
  const usedOAuthCodes = useRef<Set<string>>(new Set()).current;

  // Attempts to restore auth state from stored tokens on component mount
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const idToken = localStorage.getItem('idToken');
        const refreshTokenValue = localStorage.getItem('refreshToken');
        const userRole = localStorage.getItem('userRole');
        
        // Early exit if no tokens and not an admin
        if (!idToken && !refreshTokenValue && userRole !== 'Administrator') {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        // First try to use the existing idToken
        if (idToken) {
          try {
            const decodedToken: any = jwtDecode(idToken);
            const currentTime = Math.floor(Date.now() / 1000);
            
            // If token is valid and not expired
            if (decodedToken.exp && decodedToken.exp > currentTime) {
              const userData = sessionManager.getUserData();
              if (userData) {
                setUser(userData);
                setIsAuthenticated(true);
                
                // Get user role
                const userRole = userData.role || userData['custom:role'] || 'User';
                
                // Check for admin role in multiple places
                const isAdminRole = 
                  userRole === 'Administrator' || 
                  userRole === 'Admin' || 
                  userData['custom:role'] === 'Administrator' || 
                  userData['custom:role'] === 'Admin' ||
                  userRole === 'Administrator';
                
                if (isAdminRole) {
                  setIsAdmin(true);
                  localStorage.setItem('isAdmin', 'true');
                  localStorage.setItem('adminAuthCompleted', 'true');
                }
                
                // Store user role
                localStorage.setItem('userRole', userRole);
                
                // If SubUser, ensure they can only access Flights page
                if (userRole === 'SubUser') {
                  localStorage.setItem('isSubUser', 'true');
                }
                
                // Ensure session is marked as active
                localStorage.setItem('pilotforceSessionActive', 'true');
                localStorage.setItem('pilotforceSessionTimestamp', Date.now().toString());
                sessionStorage.setItem('sessionActive', 'true');
                
                setLoading(false);
                return;
              }
            } else {
            }
          } catch (err) {
          }
        }

        // If we get here, either:
        // 1. We have no idToken but have a refreshToken
        // 2. The idToken is expired
        // 3. The idToken is invalid
        // In all cases, try to refresh the token
        if (refreshTokenValue) {
          try {
            const refreshed = await refreshTokenHandler();
            if (refreshed) {
              const userData = sessionManager.getUserData();
              if (userData) {
                setUser(userData);
                setIsAuthenticated(true);
                
                // Check for admin role in multiple places
                const isAdminRole = 
                  userData.role === 'Administrator' || 
                  userData.role === 'Admin' || 
                  userData['custom:role'] === 'Administrator' ||
                  userData['custom:role'] === 'Admin' ||
                  userRole === 'Administrator';
                
                if (isAdminRole) {
                  setIsAdmin(true);
                  localStorage.setItem('isAdmin', 'true');
                  localStorage.setItem('adminAuthCompleted', 'true');
                } else {
                  localStorage.setItem('userRole', userData.role || userData['custom:role'] || 'User');
                }
                
                // Ensure session is marked as active
                localStorage.setItem('pilotforceSessionActive', 'true');
                localStorage.setItem('pilotforceSessionTimestamp', Date.now().toString());
                sessionStorage.setItem('sessionActive', 'true');
                
                setLoading(false);
                return;
              }
            }
          } catch (refreshError) {
          }
        }

        // If we get here, we couldn't authenticate
        clearAuthData();
      } catch (err: any) {
        setError(err instanceof Error ? err.message : err.toString());
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (usernameOrParams: string | { username: string; password: string }, password?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let sanitizedUsername: string;
      let sanitizedPassword: string;
      
      if (typeof usernameOrParams === 'object') {
        sanitizedUsername = usernameOrParams.username.trim();
        sanitizedPassword = usernameOrParams.password.trim();
      } else {
        sanitizedUsername = usernameOrParams.trim();
        sanitizedPassword = password || '';
      }

      if (!sanitizedUsername || !sanitizedPassword) {
        setError('Username and password are required');
        throw new Error('Username and password are required');
      }

      const response = await authService.login({ 
        username: sanitizedUsername, 
        password: sanitizedPassword 
      });

      if (!response.success) {
        setError(response.message || 'Login failed');
        setIsAuthenticated(false);
        setUser(null);
        throw new Error(response.message || 'Login failed');
      }

      if (response.success) {
        const { storeAuthTokens } = await import('../utils/sessionPersistence');
        storeAuthTokens(
          response.idToken || null,
          response.refreshToken || null,
          response.accessToken || null,
          response.user || null
        );

        if (response.idToken) {
          localStorage.setItem('idToken', response.idToken);
          saveCognitoUserDetailsFromIdToken(response.idToken);
        }
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        if (response.accessToken) {
          localStorage.setItem('accessToken', response.accessToken);
        }

        const tokens = {
          idToken: response.idToken || null,
          accessToken: response.accessToken || null,
          refreshToken: response.refreshToken || null
        };
        localStorage.setItem('tokens', JSON.stringify(tokens));
        try { sessionStorage.setItem('tokens', JSON.stringify(tokens)); } catch (e) {}

        if (response.user) {
          sessionManager.storeUserData(response.user);
          setUser(response.user);
        } else {
          try {
            const userResponse = await authService.getCurrentUser();
            if (userResponse.success && userResponse.user) {
              setUser(userResponse.user);
              sessionManager.storeUserData(userResponse.user);
            }
          } catch (userErr) {
          }
        }

        try {
          const { syncAuthTokensAcrossStorage } = await import('../utils/authDebugger');
          syncAuthTokensAcrossStorage();
        } catch (debugErr) {
        }

        setIsAuthenticated(true);
        return response;
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : err.toString());
      setIsAuthenticated(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Get the current idToken and auth provider
      const idToken = localStorage.getItem('idToken');
      const authProvider = localStorage.getItem('authProvider');
      
      // Debug logging
      console.log('Logout initiated:', { authProvider, hasIdToken: !!idToken });
      
      // Log the logout event
      securityAuditLogger.logEvent(
        'SECURITY_EVENT',
        user?.userId || user?.id || 'unknown',
        'User logout',
        { authProvider, hasIdToken: !!idToken },
        new Date().toISOString(),
        undefined,
        true,
        undefined,
        'auth',
        user?.userId || user?.id || 'unknown',
        'LOW'
      );
      
      // Clear local storage and session
      await authService.logout();
      authUtils.clearAuthData();
      localStorage.removeItem('pendingInviteCode');
      localStorage.removeItem('msAuthState');
      localStorage.removeItem('googleAuthState');
      sessionManager.clearSession();
      setUser(null);
      setIsAuthenticated(false);

      // Handle provider-specific logout
      if (authProvider === 'microsoft') {
        console.log('Performing Microsoft logout');
        // Microsoft logout - redirect to Microsoft logout endpoint
        const clientId = process.env.REACT_APP_MICROSOFT_CLIENT_ID || '';
        const redirectUri = (process.env.REACT_APP_BASE_URL || window.location.origin) + '/login'; // Redirect to login page instead of callback
        const tenantId = 'common'; // Force to 'common' for multi-tenant applications
        
        const logoutUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?` +
          `post_logout_redirect_uri=${encodeURIComponent(redirectUri)}` +
          (idToken ? `&id_token_hint=${idToken}` : '');

        console.log('Redirecting to Microsoft logout:', logoutUrl);
        window.location.href = logoutUrl;
      } else {
        console.log('Performing standard logout (Google or other provider)');
        // For Google or any other provider, just redirect to login page
        // Google doesn't have a standard logout endpoint that we can use
        window.location.href = '/login';
      }
      
      // Clear the auth provider after logout
      localStorage.removeItem('authProvider');
      
    } catch (err: any) {
      // Log failed logout attempt
      securityAuditLogger.logEvent(
        'SECURITY_EVENT',
        user?.userId || user?.id || 'unknown',
        'User logout failed',
        { error: err.message, authProvider: localStorage.getItem('authProvider') },
        new Date().toISOString(),
        undefined,
        false,
        undefined,
        'auth',
        user?.userId || user?.id || 'unknown',
        'MEDIUM'
      );
      
      console.error('Logout error:', err);
      authUtils.clearAuthData();
      sessionManager.clearSession();
      setError(err instanceof Error ? err.message : err.toString());
      setUser(null);
      setIsAuthenticated(false);
      
      // Fallback to login page on error
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  };

  const initiateGoogleLogin = async (): Promise<boolean> => {
    try {
      // Generate state parameter for security
      const state = Math.random().toString(36).substring(7);
      localStorage.setItem('googleAuthState', state);
      
      // Create Google OAuth URL with prompt=select_account to always show account picker
      const url = urlUtils.createGoogleOAuthUrl(
        process.env.REACT_APP_COGNITO_DOMAIN || '',
        process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '',
        process.env.REACT_APP_COGNITO_REDIRECT_URI || window.location.origin + '/oauth-callback',
        state,
        'select_account'  // This forces the account selection screen
      );
      // Redirect to Google login
      window.location.href = url;
      return true;
    } catch (error) {
      return false;
    }
  };
  
  const initiateMicrosoftLogin = async (): Promise<boolean> => {
    try {
      // Hardcoded Microsoft OAuth configuration
      const clientId = process.env.REACT_APP_MICROSOFT_CLIENT_ID || '';
      const redirectUri = (process.env.REACT_APP_BASE_URL || window.location.origin) + '/auth/microsoft/callback';
      const tenantId = 'common'; // Force to 'common' for multi-tenant applications

      // Generate state parameter for security
      const state = Math.random().toString(36).substring(7);
      localStorage.setItem('msAuthState', state);

      // Create Microsoft OAuth URL with prompt=select_account to always show account picker
      const url = urlUtils.createMicrosoftOAuthUrl(
        clientId,
        redirectUri,
        tenantId,
        state,
        'select_account'  // This forces the account selection screen
      );
      // Redirect to Microsoft login
      window.location.href = url;
      return true;
    } catch (error) {
      return false;
    }
  };
  
  const processOAuthCallback = async (code: string, inviteCode?: string, provider: 'google' | 'microsoft' = 'google'): Promise<any> => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the API endpoint from environment variable or use the default API Gateway URL
      const apiEndpoint = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_ENDPOINT || '';
      
      // Ensure the endpoint doesn't have trailing slash
      const baseUrl = apiEndpoint.endsWith('/') ? apiEndpoint.slice(0, -1) : apiEndpoint;
      
      // Build the OAuth callback endpoint URL based on provider
      const oauthCallbackUrl = `${baseUrl}/oauth-callback/${provider}`;
      
      // Get configuration from environment variables based on provider
      const clientId = provider === 'microsoft' 
        ? process.env.REACT_APP_MICROSOFT_CLIENT_ID || ''  // Microsoft client ID
        : process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID;
      
      const redirectUri = provider === 'microsoft'
        ? (process.env.REACT_APP_BASE_URL || window.location.origin) + '/auth/microsoft/callback'  // Microsoft redirect URI
        : process.env.REACT_APP_COGNITO_REDIRECT_URI || window.location.origin + '/oauth-callback';
      // Create the request payload
      const payload = {
        code,
        clientId,
        redirectUri,
        inviteCode,
        provider
      };
      
      // SSO authentication attempt
      securityAuditLogger.logAuthentication('pending', false, {
        message: 'Initiating SSO authentication flow',
        flow: 'sso',
        provider: provider
      });
      
      // Make the request to exchange the code for tokens
      const response = await fetch(oauthCallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Check for the specific NO_INVITATION_FOUND error code
        if (errorData.errorCode === 'NO_INVITATION_FOUND') {
          // Store the email for use in the request access form
          if (errorData.email) {
            localStorage.setItem('pendingEmail', errorData.email);
          }
          // Log failed authentication due to no invitation
          securityAuditLogger.logAuthentication(errorData.email || 'unknown', false, {
            status: 'failed',
            flow: 'sso',
            provider,
            error: 'No invitation found',
            message: 'Authentication failed - No invitation found',
            timestamp: new Date().toISOString()
          });
          setError('No invitation found. Please request access.');
          throw new Error('No invitation found. Please request access.');
        }
        
        // Log failed authentication
        securityAuditLogger.logAuthentication('unknown', false, {
          status: 'failed',
          flow: 'sso',
          provider,
          error: errorData.message || 'Unknown error',
          message: 'Authentication failed',
          timestamp: new Date().toISOString()
        });
        throw new Error(errorData.message || 'Failed to exchange code for tokens');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        // Log failed authentication
        securityAuditLogger.logAuthentication(data.user?.email || 'unknown', false, {
          status: 'failed',
          flow: 'sso',
          provider,
          error: data.message || 'Unknown error',
          message: 'Authentication failed',
          timestamp: new Date().toISOString()
        });
        throw new Error(data.message || 'Failed to process OAuth callback');
      }
      
      // Store tokens and user data
      if (data.tokens) {
        localStorage.setItem('idToken', data.tokens.id_token);
        localStorage.setItem('accessToken', data.tokens.access_token);
        if (data.tokens.refresh_token) {
          localStorage.setItem('refreshToken', data.tokens.refresh_token);
        }
      }
      
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        
        // Set admin status if applicable
        if (data.user.role === 'Administrator') {
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('adminAuthCompleted', 'true');
          localStorage.setItem('adminLoginTimestamp', Date.now().toString());
          setIsAdmin(true);
        }
        
        // SSO authentication success
        securityAuditLogger.logAuthentication(data.user.email, true, {
          message: 'SSO authentication successful',
          flow: 'sso',
          provider: provider,
          userId: data.user.id
        });
      }
      
      // Only mark the code as used after successful processing
      usedOAuthCodes.add(code);
      
      setIsAuthenticated(true);
      setLoading(false);
      
      return data;
    } catch (error) {
      // SSO authentication failure
      securityAuditLogger.logAuthentication('unknown', false, {
        message: 'SSO authentication failed',
        flow: 'sso',
        provider: provider,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setError(error instanceof Error ? error.message : 'Failed to process authentication');
      setLoading(false);
      throw error;
    }
  };

  const refreshTokenHandler = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      
      if (!refreshTokenValue) {
        return false;
      }
      
      // Use the authUtils function to detect Google SSO users
      const isGoogleSSOUser = authUtils.isGoogleSSOUser();
      const username = localStorage.getItem('auth_username') || 
                      localStorage.getItem('cognito_username');
      
      // Check if we're dealing with a CompanyAdmin or User role
      const userRole = localStorage.getItem('userRole');
      const isCompanyAdmin = userRole?.toLowerCase() === 'companyadmin';
      
      // For non-Google users, try regular token refresh first
      if (!isGoogleSSOUser) {
        const response = await authService.refreshToken();
        
        if (response.success) {
          // Store the new tokens using the session manager
          sessionManager.storeTokens({
            idToken: response.idToken,
            refreshToken: response.refreshToken,
            accessToken: response.accessToken
          });
          
          if (response.idToken) {
            saveCognitoUserDetailsFromIdToken(response.idToken);
          }
          
          setIsAuthenticated(true);
          return true;
        }
        
        // If token refresh failed and we're not a special user type, just return false
        if (!isCompanyAdmin && !isGoogleSSOUser) {
          sessionManager.clearSession();
          return false;
        }
      }
      
      // Only redirect for Google SSO or CompanyAdmin users if we're on a page that needs auth
      const currentPath = window.location.pathname;
      const isAuthRequiredPath = !['/login', '/signup', '/oauth-callback'].includes(currentPath);
      
      if ((isGoogleSSOUser || isCompanyAdmin) && isAuthRequiredPath) {
        // Store current path for redirect after login
        localStorage.setItem('auth_redirect_path', currentPath);
        
        // Initiate OAuth flow
        window.location.href = urlUtils.createGoogleOAuthUrl(
          process.env.REACT_APP_COGNITO_DOMAIN || '', 
          process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '', 
          process.env.REACT_APP_COGNITO_REDIRECT_URI || '',
          Math.random().toString(36).substring(2, 15)
        );
        
        return true;
      }
      
      // If we get here, clear auth data
      sessionManager.clearSession();
      return false;
    } catch (err) {
      sessionManager.clearSession();
      return false;
    }
  };

  // Helper function to clear auth data
  const clearAuthData = () => {
    sessionManager.clearSession();
    setIsAuthenticated(false);
    setUser(null);
    setIsAdmin(false);
  };

  const refreshToken = refreshTokenHandler;

  const checkAuth = async (): Promise<boolean> => {
    if (isAuthenticated) {
      return true;
    }
    
    const refreshResult = await refreshTokenHandler();
    return refreshResult;
  };

  const signUp = async (userData: any): Promise<any> => {
    setLoading(true);
    setError(null);
    
    try {
      const { username, password, ...attributes } = userData;
      const response = await authService.signup(username, password, attributes);
      return response;
    } catch (err: any) {
      setError(err instanceof Error ? err.message : err.toString());
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmUser = async (username: string, code: string): Promise<any> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.confirmSignup(username, code);
      return response;
    } catch (err: any) {
      setError(err instanceof Error ? err.message : err.toString());
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmSignUp = async (username: string, code: string): Promise<any> => {
    return await authService.confirmSignUp(username, code);
  };

  const resendConfirmationCode = async (username: string): Promise<any> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.resendConfirmationCode(username);
      return response;
    } catch (err: any) {
      setError(err instanceof Error ? err.message : err.toString());
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirect = initiateGoogleLogin;

  const handleMicrosoftRedirect = initiateMicrosoftLogin;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        user,
        error,
        login,
        logout,
        initiateGoogleLogin,
        initiateMicrosoftLogin,
        processOAuthCallback,
        refreshToken,
        isAdmin,
        checkAuth,
        signUp,
        confirmUser,
        confirmSignUp,
        resendConfirmationCode,
        handleGoogleRedirect: initiateGoogleLogin,
        handleMicrosoftRedirect: initiateMicrosoftLogin,
        handleOAuthCallback: processOAuthCallback
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};