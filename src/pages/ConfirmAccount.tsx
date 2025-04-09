import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import cognitoService from '../services/cognitoService';

const ConfirmAccount: React.FC = () => {
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { confirmUser, resendConfirmationCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Get username from query params or localStorage
    const params = new URLSearchParams(location.search);
    const usernameParam = params.get('username');
    const storedUsername = localStorage.getItem('pendingConfirmation');
    
    if (usernameParam) {
      setUsername(usernameParam);
    } else if (storedUsername) {
      setUsername(storedUsername);
    }
  }, [location]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (!code.trim()) {
      setError('Verification code is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First try with the auth context method
      try {
        const result = await confirmUser(username.trim(), code.trim());
        setSuccess(true);
        
        // Clear the pending confirmation
        localStorage.removeItem('pendingConfirmation');
        
        // Redirect to login after a brief delay
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Account confirmed successfully. You can now log in.' 
            }
          });
        }, 2000);
      } catch (contextError: any) {
        console.error('Error with context confirmUser:', contextError);
        
        // Fall back to direct Cognito service on failure
        console.log('Falling back to direct Cognito service');
        const result = await cognitoService.cognitoConfirmSignUp(username.trim(), code.trim());
        
        if (result.success) {
          setSuccess(true);
          
          // Clear the pending confirmation
          localStorage.removeItem('pendingConfirmation');
          
          // Redirect to login after a brief delay
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                message: 'Account confirmed successfully. You can now log in.' 
              }
            });
          }, 2000);
        } else {
          throw new Error(result.message || 'Failed to confirm account');
        }
      }
    } catch (err: any) {
      console.error('Confirmation error:', err);
      setError(err.message || 'Failed to confirm account');
      
      // Check for specific error messages that might need special handling
      if (err.message?.includes('Invalid verification code')) {
        setError('The verification code you entered is invalid. Please try again.');
      } else if (err.message?.includes('expired')) {
        setError('Your verification code has expired. Please request a new code.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendCode = async () => {
    if (!username.trim()) {
      setError('Username is required to resend the code');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await resendConfirmationCode(username.trim());
      setError(null);
      alert('A new verification code has been sent to your email.');
    } catch (err: any) {
      console.error('Error resending code:', err);
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Confirm Your Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the verification code sent to your email
          </p>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error}
                </h3>
              </div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Account confirmed successfully! Redirecting to login...
                </h3>
              </div>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || success}
              />
            </div>
            <div>
              <label htmlFor="code" className="sr-only">Verification Code</label>
              <input
                id="code"
                name="code"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Verification Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={loading || success}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <button
                type="button"
                className="font-medium text-blue-600 hover:text-blue-500"
                onClick={handleResendCode}
                disabled={loading || success}
              >
                Resend verification code
              </button>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading || success
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
              disabled={loading || success}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : success ? (
                'Confirmed!'
              ) : (
                'Confirm Account'
              )}
            </button>
          </div>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                or
              </span>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button
              type="button"
              className="font-medium text-blue-600 hover:text-blue-500"
              onClick={() => navigate('/login')}
            >
              Return to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmAccount;
