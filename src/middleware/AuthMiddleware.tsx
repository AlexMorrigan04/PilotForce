import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTokenInfo, shouldRefreshToken, debugAuthState } from '../utils/tokenDebugger';
import { isAuthenticated, needsSessionRefresh } from '../utils/sessionPersistence';

interface AuthMiddlewareProps {
  children: React.ReactNode;
}

const AuthMiddleware: React.FC<AuthMiddlewareProps> = ({ children }) => {
  const { isAuthenticated: authContextAuthenticated, checkAuth } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  
  // Check token on initial load and set up periodic checks
  useEffect(() => {
    const verifyToken = async () => {
      setIsChecking(true);
      
      // Log auth state to help with debugging
      debugAuthState();
      
      // Check if user is authenticated with our utility functions
      if (!isAuthenticated()) {
        console.warn('No valid token found, trying to refresh...');
        await checkAuth();
        
        // Check again after refresh attempt
        if (!isAuthenticated()) {
          console.warn('Authentication refresh failed, redirecting to login');
          navigate('/login', { 
            state: { 
              from: window.location.pathname,
              reason: 'session_expired' 
            } 
          });
          setIsChecking(false);
          return;
        }
      } else if (needsSessionRefresh()) {
        // Token exists but is going to expire soon, refresh it proactively
        await checkAuth();
      }
      
      setIsChecking(false);
    };
    
    verifyToken();
    
    // Set up periodic token checks (every 2 minutes)
    const tokenCheckInterval = setInterval(async () => {
      // Only do full verification if user seems to be active
      // by checking recent activity timestamp from the SessionManager
      const lastActivity = localStorage.getItem('pilotforce_session_timestamp') || '0';
      const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
      
      // If user has been active in the last 10 minutes
      if (timeSinceActivity < 10 * 60 * 1000) {
        
        if (needsSessionRefresh()) {
          await checkAuth();
        }
      }
    }, 2 * 60 * 1000); // Check every 2 minutes
    
    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, [navigate, checkAuth]);
  
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-gray-600">Verifying authentication...</p>
      </div>
    );
  }
  
  return <>{children}</>;
};

export default AuthMiddleware;
