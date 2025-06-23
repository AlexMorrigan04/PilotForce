import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  redirectPath?: string;
  redirectAdmins?: boolean;
}

/**
 * ProtectedRoute component - Protects routes by checking authentication status
 * and optional role requirements
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectPath = '/login',
  redirectAdmins = false
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean>(false);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (loading) return;

      if (!user) {
        navigate(redirectPath);
        return;
      }

      const userRole = user.role || user['custom:role'] || 'User';

      // Special handling for SubUser role
      if (userRole === 'SubUser') {
        // SubUsers can only access /my-bookings
        if (location.pathname !== '/my-bookings') {
          navigate('/my-bookings');
          return;
        }
        setHasAccess(true);
        return;
      }

      // For other roles, check normal role hierarchy
      const hasRequiredRole = 
        userRole === requiredRole || 
        (requiredRole === 'User' && ['User', 'CompanyAdmin', 'Admin', 'Administrator'].includes(userRole)) ||
        (requiredRole === 'CompanyAdmin' && ['CompanyAdmin', 'Admin', 'Administrator'].includes(userRole));

      setHasAccess(hasRequiredRole);

      // Redirect if no access
      if (!hasRequiredRole) {
        navigate(redirectPath);
      }
    };

    checkAuthorization();
  }, [user, loading, requiredRole, redirectPath, navigate, location.pathname]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return hasAccess ? <>{children}</> : null;
};

export default ProtectedRoute;
