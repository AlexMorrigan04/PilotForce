import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import debugTokens from '../utils/debugTokens';
import oauthProtection from '../utils/oauthProtection';

// OAuthCallback component - processes the OAuth redirect
const OAuthCallback = () => {
  const { processOAuthCallback, isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processed, setProcessed] = useState(false);
  const processingCode = useRef<string | null>(null);
  const processingComplete = useRef(false);
  const processingTimeout = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = useRef<number>(3);
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef<boolean>(true);
  
  // Cleanup function
  useEffect(() => {
    return () => {
      if (processingTimeout.current) {
        clearTimeout(processingTimeout.current);
      }
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const processCallback = async () => {
      // If we've already completed processing, don't do it again
      if (processingComplete.current) {
        return;
      }

      try {
        // Extract authorization code from URL
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        // Clean OAuth parameters from URL to prevent reprocessing on history navigation
        oauthProtection.clearOAuthParamsFromUrl();
        
        // Get any saved invitation code
        const inviteCode = localStorage.getItem('pendingInviteCode') || undefined;
        
        // Check for OAuth loop
        if (oauthProtection.detectOAuthLoop()) {
          // Only clear essential auth data
          const authDataToPreserve = {
            email: localStorage.getItem('auth_email'),
            username: localStorage.getItem('auth_username'),
            pendingEmail: localStorage.getItem('pendingEmail')
          };
          
          // Clear auth data
          oauthProtection.clearAuthData();
          
          // Restore preserved data
          if (authDataToPreserve.email) localStorage.setItem('auth_email', authDataToPreserve.email);
          if (authDataToPreserve.username) localStorage.setItem('auth_username', authDataToPreserve.username);
          if (authDataToPreserve.pendingEmail) localStorage.setItem('pendingEmail', authDataToPreserve.pendingEmail);
          
          // Redirect to request access instead of showing error
          const email = authDataToPreserve.email || authDataToPreserve.pendingEmail;
          navigate('/request-access', { 
            replace: true,
            state: { email: email || '' }
          });
          return;
        }
        
        // If no code, redirect to request access
        if (!code) {
          const email = localStorage.getItem('pendingEmail') || localStorage.getItem('auth_email');
          navigate('/request-access', { 
            replace: true,
            state: { email: email || '' }
          });
          return;
        }
        
        // Check if this code was already processed
        if (oauthProtection.isCodeAlreadyProcessed(code)) {
          setProcessed(true);
          
          // If we have valid auth data, redirect to appropriate dashboard
          const hasValidAuth = localStorage.getItem('idToken') && localStorage.getItem('accessToken');
          if (hasValidAuth) {
            const isAdmin = localStorage.getItem('isAdmin') === 'true';
            navigate(isAdmin ? '/admin-dashboard' : '/dashboard', { replace: true });
          } else {
            const email = localStorage.getItem('pendingEmail') || localStorage.getItem('auth_email');
            navigate('/request-access', { 
              replace: true,
              state: { email: email || '' }
            });
          }
          return;
        }
        
        // Process the OAuth callback
        const result = await processOAuthCallback(code, inviteCode);
        
        if (result.success) {
          // Store user role and admin status
          if (result.user?.role) {
            localStorage.setItem('userRole', result.user.role);
            
            // Set admin flags if applicable
            if (result.user.role === 'Administrator') {
              localStorage.setItem('isAdmin', 'true');
              localStorage.setItem('adminAuthCompleted', 'true');
              localStorage.setItem('adminLoginTimestamp', Date.now().toString());
            }
          }
          
          // Ensure session is marked as active
          localStorage.setItem('pilotforceSessionActive', 'true');
          localStorage.setItem('pilotforceSessionTimestamp', Date.now().toString());
          sessionStorage.setItem('sessionActive', 'true');
          
          // Mark this code as processed
          oauthProtection.markCodeAsProcessed(code);
          
          // Reset OAuth loop detection
          oauthProtection.resetOAuthLoopDetection();
          
          setProcessed(true);
          processingComplete.current = true;
          
          // Add a small delay before navigation to ensure auth state is updated
          processingTimeout.current = setTimeout(() => {
            const isAdmin = localStorage.getItem('isAdmin') === 'true' || 
                          result.user?.role === 'Administrator';
            
            navigate(isAdmin ? '/admin-dashboard' : '/dashboard', { replace: true });
          }, 1500); // Increased delay to ensure state is properly updated
        } else {
          // On any failure, redirect to request access
          const email = localStorage.getItem('pendingEmail') || localStorage.getItem('auth_email');
          navigate('/request-access', { 
            replace: true,
            state: { email: email || '' }
          });
        }
      } catch (err: any) {
        // Get the stored email if available
        const email = localStorage.getItem('pendingEmail') || localStorage.getItem('auth_email');
        
        // Clear auth tokens but keep the email for the request form
        localStorage.removeItem('idToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Redirect to request access page
        navigate('/request-access', { 
          replace: true,
          state: { email: email || '' }
        });
      } finally {
        processingRef.current = false;
        setLoading(false);
      }
    };

    processCallback();
  }, [location, navigate, processOAuthCallback]);

  // Only show loading state while processing
  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Processing Authentication</h2>
          <p className="text-sm text-gray-500 mt-2">Please wait while we complete your login...</p>
        </div>
      </div>
    );
  }

  // Show processing state
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Completing Login</h2>
        <p className="text-sm text-gray-500 mt-2">Redirecting you to your dashboard...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
