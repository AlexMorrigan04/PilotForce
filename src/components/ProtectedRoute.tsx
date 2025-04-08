import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string; // Optional role requirement
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading, isAuthenticated, checkAuth } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const location = useLocation();
  
  // Check authentication status when component mounts
  useEffect(() => {
    const verifyAuth = async () => {
      setIsChecking(true);
      
      if (!isAuthenticated && !loading) {
        await checkAuth();
      }
      
      // Check role requirements if specified
      if (requiredRole && user) {
        const userRole = user.role || user['custom:role'] || 'User';
        // Simple role hierarchy: Admin > CompanyAdmin > User
        const hasRequiredRole = 
          userRole === requiredRole || 
          (requiredRole === 'User') || 
          (requiredRole === 'CompanyAdmin' && userRole === 'Admin');
          
        setHasAccess(isAuthenticated && hasRequiredRole);
      } else {
        setHasAccess(isAuthenticated);
      }
      
      setIsChecking(false);
    };
    
    verifyAuth();
  }, [isAuthenticated, loading, checkAuth, user, requiredRole]);
  
  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // Redirect to login page with return path
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  if (requiredRole && !hasAccess) {
    // Redirect to unauthorized page if role requirement not met
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
