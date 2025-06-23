import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleAuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { processOAuthCallback, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);
  const processedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const processGoogleRedirect = async () => {
      try {
        // Extract the code from the URL
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const state = searchParams.get('state');
        
        // Check for error in the callback
        if (error) {
          setError(errorDescription || 'Authentication failed');
          navigate('/login');
          return;
        }
        
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
        // Process the Google callback
        const result = await processOAuthCallback(code, state || undefined, 'google');
        
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
          
          // Clear any pending navigation timeouts
          const timeoutId = setTimeout(() => {
            navigate('/dashboard');
          }, 100);
          
          return () => clearTimeout(timeoutId);
        } else {
          setError(result.message || 'Authentication failed');
          navigate('/login');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during authentication');
        navigate('/login');
      } finally {
        processingRef.current = false;
      }
    };

    processGoogleRedirect();
  }, [processOAuthCallback, navigate, location.search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing Google login...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-600">Error: {error}</p>
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

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing Google authentication...</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;