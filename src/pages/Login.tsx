import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMoon, FiSun, FiAlertCircle, FiInfo } from 'react-icons/fi';
import logo from '../images/logo.png'; // Update with your actual logo path
import GoogleLoginButton from '../components/GoogleLoginButton';
import MicrosoftLoginButton from '../components/MicrosoftLoginButton';
import { getCognitoConfig } from '../utils/cognitoConfig';
import { initiateGoogleLogin, initiateGoogleLoginWithSelection } from '../services/googleAuthService';
import { initiateMicrosoftLogin, initiateMicrosoftLoginWithSelection } from '../services/microsoftAuthService';

const Login: React.FC = () => {
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const [isMicrosoftLoggingIn, setIsMicrosoftLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cognitoInfo, setCognitoInfo] = useState<any>(null);
  const [showCognitoInfo, setShowCognitoInfo] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const { loading, isAuthenticated, initiateGoogleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize dark mode from localStorage and check for invitation code
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Get Cognito configuration for display
    const config = getCognitoConfig();
    setCognitoInfo(config);

    // Check for invitation code in the URL
    const searchParams = new URLSearchParams(window.location.search);
    const inviteParam = searchParams.get('invite');
    if (inviteParam) {
      setInviteCode(inviteParam);
      // Store the invite code for use during login
      localStorage.setItem('pendingInviteCode', inviteParam);
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Get returnTo path from URL query parameters
  const getReturnPath = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('returnTo') || '/dashboard';
  };

  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(getReturnPath());
    }
  }, [isAuthenticated, navigate]);

  // Handle Google login
  const handleGoogleLogin = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.preventDefault();
    setError(null);
    setIsGoogleLoggingIn(true);
    
    try {
      // Reset loading state after a timeout if no redirect happens
      const timeoutId = setTimeout(() => {
        setIsGoogleLoggingIn(false);
        setError('Login attempt timed out. Please try again.');
      }, 10000);
      
      const success = await initiateGoogleLogin();
      
      clearTimeout(timeoutId);
      
      if (!success) {
        setError('Failed to initiate Google login. Please try again.');
        setIsGoogleLoggingIn(false);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during Google login');
      setIsGoogleLoggingIn(false);
    }
  };

  // Handle Microsoft login
  const handleMicrosoftLogin = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.preventDefault();
    setError(null);
    setIsMicrosoftLoggingIn(true);
    
    try {
      // Reset loading state after a timeout if no redirect happens
      const timeoutId = setTimeout(() => {
        setIsMicrosoftLoggingIn(false);
        setError('Login attempt timed out. Please try again.');
      }, 10000);
      
      const success = await initiateMicrosoftLogin();
      
      clearTimeout(timeoutId);
      
      if (!success) {
        setError('Failed to initiate Microsoft login. Please try again.');
        setIsMicrosoftLoggingIn(false);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during Microsoft login');
      setIsMicrosoftLoggingIn(false);
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
      {/* Dark mode toggle button */}
      <button
        onClick={toggleDarkMode}
        className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
          isDarkMode 
            ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
      </button>

      {/* Debug info */}
      {showCognitoInfo && cognitoInfo && (
        <div className={`absolute top-16 left-4 p-4 rounded-lg shadow-lg text-sm font-mono z-10 ${
          isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-800'
        }`}>
          <h3 className="font-bold mb-2">Cognito Configuration:</h3>
          <p className="mb-1">User Pool ID: <span className="text-blue-500">{cognitoInfo.userPoolId || 'Not configured'}</span></p>
          <p className="mb-1">Client ID: <span className="text-green-500">{cognitoInfo.clientId || 'Not configured'}</span></p>
          <p className="mb-1">Domain: <span className="text-purple-500">{cognitoInfo.domain || 'Not configured'}</span></p>
          <p className="mb-1">Region: <span className="text-orange-500">{cognitoInfo.region || 'Not configured'}</span></p>
          {/* Show expected values for debugging */}
        </div>
      )}

      <div className="w-full max-w-md px-6">
        <motion.div 
          className={`w-full rounded-2xl ${
            isDarkMode 
              ? 'bg-gray-800 shadow-lg shadow-indigo-500/10' 
              : 'bg-white shadow-xl shadow-slate-200/50'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="p-8">
            <div className="flex flex-col items-center mb-8">
              {/* Logo placeholder - update with your actual logo */}
              <div className={`w-14 h-14 mb-4 rounded-full ${isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500'} flex items-center justify-center`}>
                <svg xmlns="" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {isGoogleLoggingIn || isMicrosoftLoggingIn ? (
                  <div className="flex items-center">
                    <span>Logging you in</span>
                    <span className="ml-1 flex">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                    </span>
                  </div>
                ) : 'Welcome to PilotForce'}
              </h2>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {isGoogleLoggingIn || isMicrosoftLoggingIn 
                  ? 'Please wait while we redirect you' 
                  : 'Sign in with your work account'}
              </p>
            </div>
            
            {/* Invitation notice */}
            {inviteCode && (
              <div className={`mb-6 p-4 rounded-lg flex items-start ${
                isDarkMode 
                  ? 'bg-indigo-900/20 border border-indigo-700 text-indigo-300' 
                  : 'bg-indigo-50 border border-indigo-100 text-indigo-700'
              }`}>
                <FiInfo className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm">We've detected an invitation code. Sign in with Google to accept your invitation.</span>
              </div>
            )}
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  className={`mb-6 p-4 rounded-lg flex items-start bg-rose-50 text-rose-700 border border-rose-100`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiAlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 space-y-3">
              {/* Google Sign-in Button */}
              <GoogleLoginButton 
                onClick={handleGoogleLogin}
                text="Sign in with Google"
                isLoading={isGoogleLoggingIn}
                isDarkMode={isDarkMode}
              />
              
              {/* Microsoft Sign-in Button */}
              <MicrosoftLoginButton 
                onClick={handleMicrosoftLogin}
                text="Sign in with Microsoft"
                isLoading={isMicrosoftLoggingIn}
                isDarkMode={isDarkMode}
              />
              
              {/* Information about invitation-only access */}
              <div className="mt-8 text-center">
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  PilotForce is invitation-only. Contact your admin for access.
                </p>
              </div>
            </div>
          </div>

          <div className={`px-8 py-4 rounded-b-2xl text-center text-sm ${isDarkMode ? 'bg-gray-750 text-gray-400 border-t border-gray-700' : 'bg-slate-50 text-gray-600 border-t border-gray-100'}`}>
            PilotForce requires an invitation. Need help?{" "}
            <Link 
              to="/request-access" 
              className={`font-medium ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'}`}
            >
              Contact us
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
