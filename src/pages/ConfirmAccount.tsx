import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ConfirmAccount: React.FC = () => {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  
  const { confirmUser, resendConfirmationCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract username from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const usernameParam = params.get('username');
    if (usernameParam) {
      setUsername(usernameParam);
    }
  }, [location]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username) {
      setError('Username is required');
      return;
    }
    
    if (!confirmationCode) {
      setError('Confirmation code is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await confirmUser(username, confirmationCode);
      setSuccess(true);
      
      // Wait 2 seconds before redirecting to show success message
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm account');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendCode = async () => {
    if (!username) {
      setError('Username is required to resend code');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResendSuccess(false);
    
    try {
      await resendConfirmationCode(username);
      setResendSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation code');
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
            Please enter the confirmation code sent to your email.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">Account confirmed successfully! Redirecting to login...</span>
          </div>
        )}
        
        {resendSuccess && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">A new confirmation code has been sent to your email.</span>
          </div>
        )}
        
        {!success && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  disabled={!!location.search.includes('username')}
                />
              </div>
              <div>
                <label htmlFor="confirmation-code" className="sr-only">Confirmation Code</label>
                <input
                  id="confirmation-code"
                  name="confirmation-code"
                  type="text"
                  required
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirmation Code"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Resend Code
              </button>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {loading ? 'Confirming...' : 'Confirm Account'}
              </button>
            </div>
            
            <div className="text-sm text-center">
              <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Back to Login
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ConfirmAccount;
