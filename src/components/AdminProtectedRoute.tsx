import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { checkAdminStatus, isAdminFromToken } from '../utils/adminUtils';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ 
  children, 
  fallbackPath = '/dashboard' 
}) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // First try to check via token in local storage (client-side)
        const idToken = localStorage.getItem('idToken');
        if (idToken && isAdminFromToken(idToken)) {
          setIsAdmin(true);
          setIsLoading(false);
          return;
        }
        
        // If client-side check fails or no ID token, verify with API
        const hasAdminAccess = await checkAdminStatus();
        setIsAdmin(hasAdminAccess);
      } catch (error) {
        console.error('Error verifying admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, []);

  if (isLoading) {
    // Show loading state
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p className="ml-3 text-gray-700">Checking permissions...</p>
    </div>;
  }

  // Redirect non-admin users
  if (!isAdmin) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Render children for admin users
  return <>{children}</>;
};

export default AdminProtectedRoute;
