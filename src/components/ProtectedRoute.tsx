import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdminLocally } from '../utils/adminUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string; // Optional role requirement
  redirectAdmins?: boolean; // New prop to control admin redirection
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  redirectAdmins = false // Default to false for backward compatibility
}) => {
  const { user, loading, isAuthenticated, checkAuth, isAdmin: contextIsAdmin } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  
  // Check authentication status when component mounts
  useEffect(() => {
    const verifyAuth = async () => {
      setIsChecking(true);
      
      if (!isAuthenticated && !loading) {
        await checkAuth();
      }
      
      // Check for admin status
      const adminStatus = contextIsAdmin || isAdminLocally();
      setIsAdmin(adminStatus);
      
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
  }, [isAuthenticated, loading, checkAuth, user, requiredRole, contextIsAdmin]);
  
  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Handle admin redirection if enabled
  if (redirectAdmins && isAdmin && !location.pathname.startsWith('/admin')) {
    console.log('Redirecting admin user to admin dashboard');
    return <Navigate to="/admin-dashboard" replace />;
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
