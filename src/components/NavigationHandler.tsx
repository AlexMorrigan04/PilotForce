/**
 * NavigationHandler Component
 * 
 * Centralizes navigation logic based on user roles
 */
import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Helper function to log navigation attempts
const logNavigationAttempt = (from: string, to: string, reason: string) => {
};

// Helper function to check if a path is a valid SubUser path
const isValidSubUserPath = (path: string): boolean => {
  // SubUsers can access:
  // - /my-bookings (main page)
  // - /flight-details/:id (booking details)
  // - /flight-data/:bookingId (flight data view)
  // - /bookings/:id (booking details)
  // - /assets (assets page)
  // - /assets/:id (asset details)
  // - /new-asset (create new asset)
  // - /profile (user profile page)
  return path === '/my-bookings' ||
         path.startsWith('/flight-details/') ||
         path.startsWith('/flight-data/') ||
         path.startsWith('/bookings/') ||
         path === '/assets' ||
         path.startsWith('/assets/') ||
         path === '/make-booking' ||
         path === '/create-booking' ||
         path === '/new-asset' ||
         path === '/profile';
};

interface NavigationHandlerProps {
  children: React.ReactNode;
}

const NavigationHandler: React.FC<NavigationHandlerProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const lastNavigationRef = useRef<string | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigationAttempts = useRef<number>(0);

  // Helper function to safely navigate
  const safeRedirect = (path: string, reason: string) => {
    // Prevent navigation to the same path
    if (location.pathname === path) {
      return;
    }

    // Prevent rapid repeated navigations to the same path
    if (lastNavigationRef.current === path) {
      return;
    }

    // Increment navigation attempts
    navigationAttempts.current++;
    
    // If we've tried to navigate too many times, something might be wrong
    if (navigationAttempts.current > 5) {
      // Don't prevent navigation completely, just reset the counter
      navigationAttempts.current = 0;
    }

    // Clear any pending navigation timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Update last navigation
    lastNavigationRef.current = path;

    // Use timeout to debounce navigation
    navigationTimeoutRef.current = setTimeout(() => {
      navigate(path, { replace: true });
      navigationTimeoutRef.current = null;
      // Reset navigation attempts after successful navigation
      navigationAttempts.current = 0;
    }, 100); // Small delay to prevent rapid navigation
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Handle initial navigation based on auth state
  useEffect(() => {
    // Skip navigation checks if auth is still loading
    if (loading) {
      return;
    }

    // Reset navigation attempts on successful auth state change
    navigationAttempts.current = 0;

    // Get current path for logging
    const currentPath = location.pathname;
    const isOAuthRoute = currentPath.includes('oauth-callback') || 
                        currentPath.includes('auth/microsoft/callback');
    const isPublicRoute = currentPath.startsWith('/login') || 
                         currentPath.startsWith('/request-access');

    // Check if we're in an active session
    const sessionActive = localStorage.getItem('pilotforceSessionActive') === 'true' &&
                        sessionStorage.getItem('sessionActive') === 'true';

    // Skip navigation if we're in the middle of OAuth processing
    if (isOAuthRoute) {
      return;
    }

    // Handle unauthenticated users
    if (!isAuthenticated && !isPublicRoute) {
      safeRedirect('/login', 'User not authenticated');
      return;
    }

    // Handle authenticated users
    if (isAuthenticated && sessionActive && !isOAuthRoute) {
      // Check for admin status from multiple sources
      const userRole = user?.role?.toLowerCase() || localStorage.getItem('userRole')?.toLowerCase() || '';
      const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';
      const isAdminRole = userRole === 'administrator';
      const shouldBeAdmin = isAdmin || storedIsAdmin || isAdminRole;
      const isSubUser = userRole === 'subuser';
      // Handle SubUser role - strictly enforce access restrictions
      if (isSubUser) {
        if (!isValidSubUserPath(currentPath) && !isPublicRoute && !isOAuthRoute) {
          safeRedirect('/my-bookings', 'SubUser restricted to Flights page');
          return;
        }
      }

      // If any admin indicator is true, ensure all admin flags are set
      if (shouldBeAdmin) {
        // Ensure admin flags are consistent
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('adminAuthCompleted', 'true');
        localStorage.setItem('adminLoginTimestamp', Date.now().toString());
        
        // Only redirect if not already on an admin page and not in the middle of OAuth
        if (!currentPath.startsWith('/admin') && !isOAuthRoute) {
          safeRedirect('/admin-dashboard', 'Admin user detected');
        } else {
        }
      } else if (currentPath === '/login' && !isOAuthRoute) {
        // Handle non-admin users on login page, but not during OAuth
        const redirectPath = isSubUser ? '/my-bookings' : (localStorage.getItem('redirectPath') || '/dashboard');
        safeRedirect(redirectPath, 'User authenticated');
      }
    }
  }, [isAuthenticated, isAdmin, loading, location.pathname, navigate, user]);

  return <>{children}</>;
};

export default NavigationHandler;
