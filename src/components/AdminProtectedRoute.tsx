import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
  const { user, isAdmin: contextIsAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // Don't proceed if auth is still loading
        if (authLoading) {
          return;
        }
        
        setIsLoading(true);
        
        // If not authenticated, redirect
        if (!isAuthenticated) {
          navigate('/login', { replace: true });
          return;
        }
        
        // First check if the user is marked as admin in the auth context
        if (contextIsAdmin) {
          setIsAdmin(true);
          localStorage.setItem('isAdmin', 'true');
          setIsLoading(false);
          return;
        }
        
        // Check user role from multiple sources
        const userRole = user?.role || localStorage.getItem('userRole');
        if (userRole && (userRole.toLowerCase() === 'administrator' || userRole.toLowerCase() === 'admin')) {
          setIsAdmin(true);
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('userRole', userRole);
          
          // Ensure session is marked as active
          localStorage.setItem('pilotforceSessionActive', 'true');
          localStorage.setItem('pilotforceSessionTimestamp', Date.now().toString());
          sessionStorage.setItem('sessionActive', 'true');
          
          setIsLoading(false);
          return;
        }
        
        // If we get here, user is not an admin
        setIsAdmin(false);
        localStorage.removeItem('isAdmin');
        navigate(fallbackPath, { replace: true });
        
      } catch (error) {
        setIsAdmin(false);
        navigate(fallbackPath, { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [user, contextIsAdmin, isAuthenticated, authLoading, navigate, fallbackPath]);

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Navigation is handled in the useEffect
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
