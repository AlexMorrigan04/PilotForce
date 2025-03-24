import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        
        if (!code) {
          console.error('No authorization code found in URL parameters');
          setError('No authorization code found. Please try logging in again.');
          setProcessing(false);
          return;
        }
        
        console.log('Authorization code received, exchanging for token...');
        
        // Exchange the code for a token using our backend API
        const response = await axios.post('/api/exchange-code', { code });
        
        if (response.data.token) {
          console.log('Successfully received token from server');
          
          // Store the token in localStorage
          localStorage.setItem('token', response.data.token);
          
          // Authenticate the user with the token
          await signIn(response.data.token, '');
          
          // Redirect to dashboard
          console.log('Authentication successful, redirecting to dashboard...');
          navigate('/dashboard', { replace: true });
        } else {
          console.error('No token received from server');
          setError('Authentication failed. No token received from server.');
          setProcessing(false);
        }
      } catch (err: any) {
        console.error('Error during OAuth callback:', err);
        setError(
          err.response?.data?.error || 
          err.message || 
          'An unexpected error occurred during authentication. Please try again.'
        );
        setProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [navigate, signIn]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
          <div className="text-red-600 text-xl font-bold mb-4">Authentication Error</div>
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-blue-600 mb-2">Completing Authentication</h2>
        <p className="text-gray-600">
          Please wait while we process your login credentials...
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;
