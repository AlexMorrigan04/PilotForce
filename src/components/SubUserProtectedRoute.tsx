import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SubUserProtectedRouteProps {
  children: React.ReactNode;
}

const SubUserProtectedRoute: React.FC<SubUserProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Log the current route and user role for debugging
  }, [location.pathname, user?.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-lg text-gray-700">Loading...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check if user is a SubUser
  const isSubUser = user?.role?.toLowerCase() === 'subuser';

  // If not a SubUser, redirect to dashboard
  if (!isSubUser) {
    return <Navigate to="/dashboard" />;
  }

  // Check if the current path is allowed for SubUsers
  const isValidSubUserPath = (path: string): boolean => {
    // SubUsers can access:
    // - /my-bookings (main page)
    // - /flight-details/:id (booking details)
    // - /flight-data/:bookingId (flight data view)
    // - /bookings/:id (booking details)
    return path === '/my-bookings' ||
           path.startsWith('/flight-details/') ||
           path.startsWith('/flight-data/') ||
           path.startsWith('/bookings/');
  };

  // If SubUser tries to access an unauthorized path, redirect them to /my-bookings
  if (!isValidSubUserPath(location.pathname)) {
    return <Navigate to="/my-bookings" replace />;
  }

  // If all checks pass, render the protected content
  return <>{children}</>;
};

export default SubUserProtectedRoute; 