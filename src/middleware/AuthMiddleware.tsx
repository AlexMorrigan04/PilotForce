import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTokenInfo } from '../utils/tokenDebugger';

interface AuthMiddlewareProps {
  children: React.ReactNode;
}

const AuthMiddleware: React.FC<AuthMiddlewareProps> = ({ children }) => {
  const { isAuthenticated, checkAuth } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  
  // Check token on initial load and set up periodic checks
  useEffect(() => {
    const verifyToken = async () => {
      setIsChecking(true);
      
      // Get token from storage
      const token = localStorage.getItem('idToken');
      
      if (!token) {
        console.warn('No token found, redirecting to login');
        navigate('/login');
        setIsChecking(false);
        return;
      }
      
      // Check if token is expired
      const tokenInfo = getTokenInfo(token);
      if (tokenInfo.isExpired) {
        console.warn('Token is expired, trying to refresh...');
        await checkAuth();
        
        // Get token again to see if it was refreshed
        const newToken = localStorage.getItem('idToken');
        const newTokenInfo = newToken ? getTokenInfo(newToken) : { isExpired: true };
        
        if (newTokenInfo.isExpired) {
          console.warn('Token refresh failed, redirecting to login');
          navigate('/login');
        }
      }
      
      setIsChecking(false);
    };
    
    verifyToken();
    
    // Set up periodic token checks (every 2 minutes)
    const tokenCheckInterval = setInterval(verifyToken, 2 * 60 * 1000);
    
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
