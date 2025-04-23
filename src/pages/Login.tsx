import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEye, FiEyeOff, FiMoon, FiSun, FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';
import logo from '../images/logo.png'; // Update with your actual logo path
import LoginAccessDeniedModal from '../components/LoginAccessDeniedModal';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [accessDeniedData, setAccessDeniedData] = useState({
    email: '',
    username: '',
    isNewDomain: false,
    companyName: '',
    approvalStatus: 'PENDING'
  });

  const { signIn, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);

    try {
      // Validate required fields before sending request
      if (!email) {
        setError('Email is required');
        setIsLoggingIn(false);
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        setIsLoggingIn(false);
        return;
      }

      if (!password) {
        setError('Password is required');
        setIsLoggingIn(false);
        return;
      }

      // Log that we're using the email for authentication
      console.log('Logging in with email address:', email);

      // Use the updated signIn function with email parameter
      const result = await signIn(email, password);
      console.log('Login result:', result);
      
      // IMPORTANT: Always check if the result has success=true AND has required tokens
      if (!result.success) {
        // Check specifically for approval required case
        if (result.requiresApproval) {
          console.log('User requires approval - showing modal:', result);
          // If the backend provides a username, use it; otherwise extract from email
          const derivedUsername = result.username || email.split('@')[0];
          
          setAccessDeniedData({
            email: result.email || email,
            username: derivedUsername,
            isNewDomain: result.isNewDomain || false,
            companyName: result.companyName || '',
            approvalStatus: result.approvalStatus || 'PENDING'
          });
          setShowAccessDeniedModal(true);
        } else if (result.needsConfirmation) {
          // Handle confirmation required case
          navigate(`/confirm-account?email=${encodeURIComponent(email)}`);
        } else {
          // General error case - be more specific about email/password combo
          setError(result.message || 'Login failed. Please check your email and password.');
        }
      } else if (result.success === true) {
        // Check if we have the required tokens
        if (result.idToken || localStorage.getItem('idToken')) {
          // Success case with token - redirect to dashboard
          navigate('/dashboard');
        } else {
          // Response says success but no tokens - error
          console.error('Login succeeded but no tokens were returned');
          setError('Authentication succeeded but no access token was received. Please try again.');
        }
      } else {
        // Unexpected response structure
        console.error('Unexpected login response:', result);
        setError('An unexpected error occurred. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
      {/* Dark mode toggle button */}
      <button
        onClick={toggleDarkMode}
        className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
          isDarkMode 
            ? 'bg-gray-800 text-yellow-300 hover:bg-gray-700' 
            : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
        }`}
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
      </button>

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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Welcome back
              </h2>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Sign in to your account
              </p>
            </div>
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  className={`mb-6 p-4 rounded-lg flex items-start ${
                    needsConfirmation 
                      ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}
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

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label 
                  htmlFor="email" 
                  className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <FiMail className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-10 w-full py-2.5 px-4 rounded-lg outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                        : 'bg-white text-gray-900 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                    placeholder="you@example.com"
                    required
                    disabled={isLoggingIn}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label 
                    htmlFor="password" 
                    className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Password
                  </label>
                  <Link 
                    to="/forgot-password" 
                    className={`text-xs font-medium ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} transition-colors`}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <FiLock className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-10 w-full py-2.5 px-4 rounded-lg outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                        : 'bg-white text-gray-900 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                    placeholder="••••••••••"
                    required
                    disabled={isLoggingIn}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none ${
                      isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    tabIndex={-1}
                  >
                    {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all ${
                  isLoggingIn || loading
                    ? 'cursor-not-allowed opacity-70' 
                    : isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
                }`}
                disabled={isLoggingIn || loading}
              >
                {isLoggingIn || loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          <div className={`px-8 py-4 rounded-b-2xl text-center text-sm ${isDarkMode ? 'bg-gray-750 text-gray-400 border-t border-gray-700' : 'bg-slate-50 text-gray-600 border-t border-gray-100'}`}>
            Don't have an account?{' '}
            <Link 
              to="/signup" 
              className={`font-medium ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'} transition-colors`}
            >
              Create an account
            </Link>
          </div>
        </motion.div>
      </div>
 
      {/* Access denied modal */}
      <LoginAccessDeniedModal
        isOpen={showAccessDeniedModal}
        onClose={() => setShowAccessDeniedModal(false)}
        email={accessDeniedData.email}
        username={accessDeniedData.username}
        isNewDomain={accessDeniedData.isNewDomain}
        companyName={accessDeniedData.companyName}
        approvalStatus={accessDeniedData.approvalStatus}
      />
    </div>
  );
};

export default Login;
