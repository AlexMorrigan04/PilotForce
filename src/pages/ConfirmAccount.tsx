import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import cognitoService from '../services/cognitoService';

const ConfirmAccount: React.FC = () => {
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(6).fill(''));
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));
  
  const { confirmUser, resendConfirmationCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const usernameParam = params.get('username');
    const storedUsername = localStorage.getItem('pendingConfirmation');
    
    if (usernameParam) {
      setUsername(usernameParam);
    } else if (storedUsername) {
      setUsername(storedUsername);
    }
    
    setTimeout(() => {
      if (codeInputRefs.current[0]) {
        codeInputRefs.current[0].focus();
      }
    }, 100);
  }, [location]);
  
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCodeDigits = [...codeDigits];
    newCodeDigits[index] = value.substring(0, 1);
    setCodeDigits(newCodeDigits);
    
    if (value !== '' && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (codeDigits[index] === '' && index > 0) {
        codeInputRefs.current[index - 1]?.focus();
      }
    }
    
    if (e.key === 'ArrowLeft' && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === 'ArrowRight' && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setCodeDigits(digits);
      codeInputRefs.current[5]?.focus();
    }
  };
  
  const getFullCode = (): string => {
    return codeDigits.join('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    const fullCode = getFullCode();
    
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of your verification code');
      return;
    }
    
    if (!/^\d{6}$/.test(fullCode)) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Attempting to confirm account for ${username} with verification code`);
      let confirmed = false;
      
      // First attempt: Try with the auth context method
      try {
        const result = await confirmUser(username.trim(), fullCode);
        
        if (result?.success) {
          console.log('Confirmation successful via auth context');
          confirmed = true;
          setSuccess(true);
          localStorage.removeItem('pendingConfirmation');
          
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                message: 'Account confirmed successfully. You can now log in.' 
              }
            });
          }, 2000);
        } else if (result?.message?.toLowerCase().includes('already confirmed')) {
          // Special case for already confirmed accounts
          confirmed = true;
          setSuccess(true);
          localStorage.removeItem('pendingConfirmation');
          
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                message: 'Account is already confirmed. You can now log in.' 
              }
            });
          }, 2000);
        } else {
          // Non-success case that's not "already confirmed"
          throw new Error(result?.message || 'Confirmation failed');
        }
      } catch (contextError: any) {
        console.error('Error with context confirmUser:', contextError);
        
        if (!confirmed) {
          // Fall back to direct Cognito service on failure
          console.log('Falling back to direct Cognito service');
          const result = await cognitoService.cognitoConfirmSignUp(username.trim(), fullCode);
          
          if (result.success) {
            console.log('Confirmation successful via direct Cognito service');
            confirmed = true;
            setSuccess(true);
            localStorage.removeItem('pendingConfirmation');
            
            setTimeout(() => {
              navigate('/login', { 
                state: { 
                  message: 'Account confirmed successfully. You can now log in.' 
                }
              });
            }, 2000);
          } else if (result.confirmationFailed) {
            // CRITICAL: Handle explicit confirmation failures
            throw new Error(result.message || 'Verification code is invalid or expired');
          } else {
            throw new Error(result.message || 'Failed to confirm account');
          }
        }
      }
      
      // IMPORTANT: If we get here and confirmed is still false, do not proceed
      if (!confirmed) {
        throw new Error('Verification failed. Please check your code and try again.');
      }
    } catch (err: any) {
      console.error('Confirmation error:', err);
      
      let errorMessage = err.message || 'Failed to confirm account';
      
      // Handle specific error messages
      if (errorMessage.toLowerCase().includes('invalid verification code') || 
          errorMessage.toLowerCase().includes('wrong code') ||
          errorMessage.toLowerCase().includes('mismatch')) {
        setError('The verification code you entered is invalid. Please try again.');
        setCodeDigits(Array(6).fill(''));
        codeInputRefs.current[0]?.focus();
      } else if (errorMessage.toLowerCase().includes('expired')) {
        setError('Your verification code has expired. Please request a new code.');
        setCodeDigits(Array(6).fill(''));
        codeInputRefs.current[0]?.focus();
      } else if (errorMessage.toLowerCase().includes('already confirmed') || 
                 errorMessage.toLowerCase().includes('already verified')) {
        // Handle the special case where the account is already confirmed
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Account is already confirmed. You can now log in.' 
            }
          });
        }, 2000);
      } else {
        setError(errorMessage);
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
      setCodeDigits(Array(6).fill(''));
      codeInputRefs.current[0]?.focus();
      alert('A new verification code has been sent to your email.');
    } catch (err: any) {
      console.error('Error resending code:', err);
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the 6-digit code sent to your email
          </p>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-100 animate-fadeIn">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error}
                </h3>
              </div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="rounded-md bg-green-50 p-4 border border-green-100 animate-fadeIn">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Account confirmed successfully! Redirecting to login...
                </h3>
              </div>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md">
            <div className="mb-6">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading || success}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {username && (
                    <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">Verification Code</label>
              <div className="flex justify-center gap-2 sm:gap-3">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div key={index} className="w-12 relative">
                    <input
                      ref={(el) => (codeInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={codeDigits[index]}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className={`w-full h-14 text-center text-xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                        codeDigits[index] ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-900'
                      } ${loading || success ? 'opacity-70' : ''}`}
                      disabled={loading || success}
                      aria-label={`Digit ${index + 1}`}
                    />
                    {index < 5 && (
                      <span className="hidden sm:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-gray-400">-</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500 text-center">
                Didn't receive your code? Check your spam folder or click "Resend"
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <button
              type="button"
              className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200 flex items-center"
              onClick={handleResendCode}
              disabled={loading || success}
            >
              <svg className="mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Resend verification code
            </button>
          </div>
          
          <div>
            <button
              type="submit"
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white shadow-sm transition-all duration-300 ${
                loading || success
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
              disabled={loading || success}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : success ? (
                <span className="flex items-center justify-center">
                  <svg className="mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Confirmed!
                </span>
              ) : (
                'Verify Account'
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
              <span className="px-2 bg-white text-gray-500">
                or
              </span>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button
              type="button"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
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
