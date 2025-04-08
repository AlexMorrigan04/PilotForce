import React, { createContext, useState, useContext, ReactNode } from 'react';
import authServices from '../services/authServices';

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
      const response = await authServices.login(username, password);

      if (response.success) {
        if (response.tokens) {
          if (response.tokens.idToken) {
            localStorage.setItem('idToken', response.tokens.idToken);
          }
          if (response.tokens.accessToken) {
            localStorage.setItem('accessToken', response.tokens.accessToken);
          }
          if (response.tokens.refreshToken) {
            localStorage.setItem('refreshToken', response.tokens.refreshToken);
          }
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

        if (response.needsConfirmation) {
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