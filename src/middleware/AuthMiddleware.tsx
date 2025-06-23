import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAuthenticated, needsSessionRefresh } from '../utils/sessionPersistence';
import { refreshToken } from '../services/authServices';
import sessionManager from '../utils/sessionManager';

interface AuthMiddlewareProps {
  children: React.ReactNode;
}

const AuthMiddleware: React.FC<AuthMiddlewareProps> = ({ children }) => {
  const { isAuthenticated: authContextAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Check if user is authenticated with our utility functions
        if (!isAuthenticated()) {
          console.warn('No valid token found, trying to refresh...');
          const refreshed = await refreshToken();
          
          // Check again after refresh attempt
          if (!refreshed || !isAuthenticated()) {
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
          await refreshToken();
        }
        
        setIsChecking(false);
      } catch (error) {
        console.error('Auth verification error:', error);
        navigate('/login', { 
          state: { 
            from: window.location.pathname,
            reason: 'verification_error' 
          } 
        });
        setIsChecking(false);
      }
    };

    verifyToken();

    // Set up session timeout callback
    const handleSessionTimeout = () => {
      console.warn('Session timeout detected in middleware');
      navigate('/login', { 
        state: { 
          from: window.location.pathname,
          reason: 'session_timeout' 
        } 
      });
    };

    // Initialize session manager with timeout callback
    sessionManager.setAutoRefreshEnabled(true);
    
    // Set up periodic session validity checks (every 5 minutes)
    const sessionCheckInterval = setInterval(() => {
      // Only check if user seems to be active
      const lastActivity = localStorage.getItem('pilotforce_last_activity') || '0';
      const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
      
      // If user has been active in the last 10 minutes, check session
      if (timeSinceActivity < 10 * 60 * 1000) {
        if (!isAuthenticated()) {
          handleSessionTimeout();
        } else if (needsSessionRefresh()) {
          refreshToken().catch(() => {
            handleSessionTimeout();
          });
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, [navigate, location]);

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
