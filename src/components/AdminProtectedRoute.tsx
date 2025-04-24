import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { checkAdminStatus, isAdminFromToken, isAdminLocally } from '../utils/adminUtils';
import { useAuth } from '../context/AuthContext';

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
  const { user, isAdmin: contextIsAdmin } = useAuth();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        setIsLoading(true);
        
        // First check if the user is marked as admin in the auth context
        if (contextIsAdmin) {
          setIsAdmin(true);
          setIsLoading(false);
          return;
        }
        
        // Next, check localStorage for quick response (avoid API calls if possible)
        if (isAdminLocally()) {
          setIsAdmin(true);
          setIsLoading(false);
          return;
        }
        
        // If local checks fail, try the token-based approach
        const idToken = localStorage.getItem('idToken');
        if (idToken && isAdminFromToken(idToken)) {
          setIsAdmin(true);
          setIsLoading(false);
          return;
        }
        
        // As a last resort, try the API call
        try {
          const hasAdminAccess = await checkAdminStatus();
          setIsAdmin(hasAdminAccess);
        } catch (apiError) {
          console.warn('API admin check failed, checking user data directly');
          
          // Check user object from auth context
          if (user && user.role) {
            const isAdminRole = user.role.toLowerCase().includes('admin');
            setIsAdmin(isAdminRole);
          } else {
            // Final fallback: check user data in localStorage directly
            const userDataStr = localStorage.getItem('userData') || localStorage.getItem('user');
            if (userDataStr) {
              try {
                const userData = JSON.parse(userDataStr);
                const role = userData.role || userData.userRole || userData.UserRole;
                const isAdminRole = role && (
                  role.toLowerCase() === 'admin' ||
                  role.toLowerCase() === 'administrator' ||
                  role.toLowerCase() === 'companyadmin'
                );
                setIsAdmin(isAdminRole);
                
                // Store for future reference
                if (isAdminRole) {
                  localStorage.setItem('isAdmin', 'true');
                }
              } catch (e) {
                setIsAdmin(false);
              }
            }
          }
        }
      } catch (error) {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [user, contextIsAdmin]);

  if (isLoading) {
    // Show loading state
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p className="ml-3 text-gray-700">Checking admin permissions...</p>
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
