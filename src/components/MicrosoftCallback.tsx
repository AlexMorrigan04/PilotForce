import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MicrosoftCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { processOAuthCallback, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);
  const processedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const processMicrosoftRedirect = async () => {
      try {
        // Extract the code and state from the URL
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const state = searchParams.get('state');
        
        // Check for error in the callback
        if (error) {
          // If the error is due to user canceling account selection, redirect back to login
          if (error === 'access_denied' || errorDescription?.includes('User declined')) {
            navigate('/login');
            return;
          }
          
          setError(errorDescription || 'Authentication failed');
          navigate('/login');
          return;
        }
        
        // Verify state parameter to prevent CSRF attacks
        const savedState = localStorage.getItem('msAuthState');
        if (state !== savedState) {
        }
        
        // Clean up the state from localStorage
        localStorage.removeItem('msAuthState');
        
        if (!code) {
          setError('No authorization code found in the callback URL');
          navigate('/login');
          return;
        }

        // Prevent multiple processing of the same code
        if (processedCodeRef.current === code || processingRef.current) {
          return;
        }

        processingRef.current = true;
        processedCodeRef.current = code;
        // Process the Microsoft callback with the provider parameter
        const result = await processOAuthCallback(code, undefined, 'microsoft');
        
        if (result.success) {
          // Set session flags
          localStorage.setItem('pilotforceSessionActive', 'true');
          localStorage.setItem('pilotforceSessionTimestamp', Date.now().toString());
          sessionStorage.setItem('sessionActive', 'true');
          
          // Store user role and admin status if available
          if (result.user?.role) {
            const role = result.user.role;
            localStorage.setItem('userRole', role);
            localStorage.setItem('lastDetectedRole', role);
            
            if (role.toLowerCase() === 'administrator') {
              localStorage.setItem('isAdmin', 'true');
              localStorage.setItem('adminAuthCompleted', 'true');
              localStorage.setItem('adminLoginTimestamp', Date.now().toString());
            }
          }
          
          // Store Microsoft-specific flags
          localStorage.setItem('authProvider', 'microsoft');
          localStorage.setItem('microsoftAuthCompleted', 'true');
          
          // Clear any pending navigation timeouts
          const timeoutId = setTimeout(() => {
            const isAdmin = localStorage.getItem('isAdmin') === 'true';
            navigate(isAdmin ? '/admin-dashboard' : '/dashboard');
          }, 1000);
          
          return () => clearTimeout(timeoutId);
        } else {
          setError(result.message || 'Authentication failed');
          navigate('/login');
        }
      } catch (err: any) {
        // Check if this is a "No invitation found" error
        if (err.message && (
          err.message.includes('No invitation found') || 
          err.message.includes('not authorized')
        )) {
          // Get the stored email if available
          const email = localStorage.getItem('pendingEmail');
          // Redirect to request access page
          navigate('/request-access', { 
            replace: true,
            state: { 
              error: 'Please request access to use PilotForce.',
              email: email || ''
            }
          });
          return;
        }
        
        setError(err.message || 'An unexpected error occurred during authentication');
        navigate('/login');
      } finally {
        processingRef.current = false;
      }
    };

    processMicrosoftRedirect();
  }, [location, navigate, processOAuthCallback]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Processing Microsoft Authentication</h2>
          <p className="text-sm text-gray-500 mt-2">Please wait while we complete your login...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <div className="text-red-500 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-700">Authentication Error</h2>
          <p className="text-sm text-red-500 mt-2">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default MicrosoftCallback; 