import React, { createContext, useState, useContext, ReactNode } from 'react';
import authServices, { AuthResponse } from '../services/authServices';

interface AuthContextProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUser: any;
  handleLogin: (username: string, password: string) => Promise<any>;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);

    try {
      const response = await authServices.login({ username, password });

      if (response.success) {
        // Create a tokens object that handles both formats of tokens in the response
        const tokens = {
          idToken: response.tokens?.idToken || response.idToken,
          accessToken: response.tokens?.accessToken || response.accessToken,
          refreshToken: response.tokens?.refreshToken || response.refreshToken
        };
        
        // Store tokens in localStorage if available
        if (tokens.idToken) {
          localStorage.setItem('idToken', tokens.idToken);
        }
        if (tokens.accessToken) {
          localStorage.setItem('accessToken', tokens.accessToken);
        }
        if (tokens.refreshToken) {
          localStorage.setItem('refreshToken', tokens.refreshToken);
        }

        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          setCurrentUser(response.user);
        }

        setIsAuthenticated(true);
        setIsLoading(false);

        return { success: true, user: response.user };
      } else {
        setIsLoading(false);

        // Handle confirmation required case
        const needsConfirmation = response.needsConfirmation || false;
        if (needsConfirmation) {
          return {
            success: false,
            needsConfirmation: true,
            username,
          };
        }

        return { success: false, message: response.message };
      }
    } catch (error: any) {
      setIsLoading(false);
      return { success: false, message: error.message || 'An unexpected error occurred' };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        currentUser,
        handleLogin,
        handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};