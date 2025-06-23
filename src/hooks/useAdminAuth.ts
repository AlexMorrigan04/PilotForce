import { useState, useEffect, useCallback } from 'react';
import { checkAdminStatus, isAdminFromToken } from '../utils/adminUtils';

/**
 * Hook for handling admin authentication status
 * @returns Admin authentication state and utility functions
 */
export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Verify admin status through multiple methods
   */
  const verifyAdminStatus = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      // First try to check from token (client-side)
      const idToken = localStorage.getItem('idToken');
      if (idToken && isAdminFromToken(idToken)) {
        setIsAdmin(true);
        setIsChecking(false);
        return true;
      }
      
      // If that fails, check with API (server-side)
      const hasAdminAccess = await checkAdminStatus();
      setIsAdmin(hasAdminAccess);
      return hasAdminAccess;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error verifying admin status';
      setError(errorMessage);
      setIsAdmin(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Check admin status on hook initialization
  useEffect(() => {
    verifyAdminStatus();
  }, [verifyAdminStatus]);

  return {
    isAdmin,
    isChecking,
    error,
    verifyAdminStatus
  };
};

export default useAdminAuth;
