import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEye, FiEyeOff, FiMoon, FiSun, FiUser, FiLock, FiAlertCircle } from 'react-icons/fi';
import loginImage from '../images/login-image.avif';
import logo from '../images/logo.png'; // Update with your actual logo path
import LoginAccessDeniedModal from '../components/LoginAccessDeniedModal';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [accessDeniedData, setAccessDeniedData] = useState({
    username: '',
    email: '',
    isNewDomain: false,
    companyName: '',
    approvalStatus: 'PENDING'
  });

  const { signIn, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize dark mode from localStorage (if available)
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
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
      if (!username) {
        setError('Username is required');
        setIsLoggingIn(false);
        return;
      }

      if (!password) {
        setError('Password is required');
        setIsLoggingIn(false);
        return;
      }

      // Use the direct API Gateway approach in the signIn function
      const result = await signIn(username, password);
      console.log('Login result:', result);
      
      // Always check for success property, which will always exist now
      if (!result.success) {
        // Check specifically for approval required case
        if (result.requiresApproval) {
          console.log('User requires approval - showing modal:', result);
          setAccessDeniedData({
            username: result.username || username,
            email: result.email || '',
            isNewDomain: result.isNewDomain || false,
            companyName: result.companyName || '',
            approvalStatus: result.approvalStatus || 'PENDING'
          });
          setShowAccessDeniedModal(true);
        } else if (result.needsConfirmation) {
          // Handle confirmation required case
          navigate(`/confirm-account?username=${encodeURIComponent(username)}`);
        } else {
          // General error case
          setError(result.message || 'Login failed. Please check your credentials.');
        }
      } else {
        // Success case - redirect to dashboard
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      {/* Dark mode toggle button */}
      <button
        onClick={toggleDarkMode}
        className={`absolute top-4 right-4 p-2 rounded-full z-10 ${isDarkMode ? 'bg-gray-800 text-yellow-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'} shadow-md transition-colors duration-300`}
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
      </button>

      {/* Left side - Image (hidden on mobile) */}
      <div className="hidden md:block md:w-1/2 bg-cover bg-center relative overflow-hidden">
        <div 
          className={`absolute inset-0 ${isDarkMode ? 'bg-black/30' : 'bg-blue-900/20'} z-10`}
          style={{ backdropFilter: 'blur(2px)' }}
        ></div>
        <img 
          src={loginImage} 
          alt="Drone imagery" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center text-white p-8 max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {/* <img src={logo} alt="PilotForce Logo" className="h-16 mx-auto mb-6" /> */}
              <h1 className="text-3xl font-bold mb-4 drop-shadow-lg">Welcome to PilotForce</h1>
              <p className="text-lg drop-shadow-md">
                Your comprehensive solution for drone operations management
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <motion.div 
          className={`w-full max-w-md p-6 md:p-8 rounded-2xl shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} transition-colors duration-300`}
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Mobile logo (shown only on mobile) */}
          <motion.div 
            className="flex justify-center mb-6 md:hidden"
            variants={itemVariants}
          >
            {/* <img src={logo} alt="PilotForce Logo" className="h-16" /> */}
          </motion.div>

          <motion.h2 
            className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
            variants={itemVariants}
          >
            Sign In
          </motion.h2>

          <motion.p 
            className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            variants={itemVariants}
          >
            Welcome back! Please sign in to continue.
          </motion.p>

          {/* Show error message from context or local state */}
          <AnimatePresence>
            {error && (
              <motion.div 
                className={`mb-4 p-4 rounded-lg flex items-start ${
                  needsConfirmation 
                    ? 'bg-yellow-100/80 text-yellow-800 border border-yellow-200' 
                    : 'bg-red-100/80 text-red-700 border border-red-200'
                }`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FiAlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin}>
            <motion.div className="mb-4" variants={itemVariants}>
              <label 
                htmlFor="username" 
                className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-blue-500'}`} />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`pl-10 w-full py-3 px-4 rounded-lg focus:ring-2 outline-none transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500 focus:ring-blue-500' 
                      : 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Enter your username"
                  required
                  disabled={isLoggingIn}
                />
              </div>
            </motion.div>

            <motion.div className="mb-6" variants={itemVariants}>
              <div className="flex justify-between items-center mb-1">
                <label 
                  htmlFor="password" 
                  className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Password
                </label>
                <Link 
                  to="/forgot-password" 
                  className={`text-xs ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-colors`}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-blue-500'}`} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 w-full py-3 px-4 rounded-lg focus:ring-2 outline-none transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500 focus:ring-blue-500' 
                      : 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Enter your password"
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
            </motion.div>

            <motion.div className="flex flex-col space-y-4" variants={itemVariants}>
              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                  isLoggingIn || loading
                    ? 'cursor-not-allowed opacity-70' 
                    : 'transform hover:-translate-y-1 hover:shadow-lg'
                } ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
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
                  'Sign In'
                )}
              </button>
            </motion.div>

            <motion.div 
              className="mt-8 text-center border-t border-gray-200 dark:border-gray-700 pt-6"
              variants={itemVariants}
            >
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Don't have an account?{' '}
                <Link 
                  to="/signup" 
                  className={`font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-colors`}
                >
                  Sign up
                </Link>
              </p>
            </motion.div>
          </form>
        </motion.div>
      </div>

      {/* Access denied modal */}
      <LoginAccessDeniedModal
        isOpen={showAccessDeniedModal}
        onClose={() => setShowAccessDeniedModal(false)}
        username={accessDeniedData.username}
        email={accessDeniedData.email}
        isNewDomain={accessDeniedData.isNewDomain}
        companyName={accessDeniedData.companyName}
        approvalStatus={accessDeniedData.approvalStatus}
      />
    </div>
  );
};

export default Login;
