import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiMoon, FiSun, FiPhone, FiBriefcase, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import loginImage from '../images/login-image.avif';

const Signup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [step, setStep] = useState(1);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

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

  const isPasswordStrong = (pwd: string) => {
    return (
      pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /[0-9]/.test(pwd) &&
      /[^A-Za-z0-9]/.test(pwd)
    );
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');
    
    // Ensure UK phone number format (E.164)
    if (digits.startsWith('0')) {
      // Convert UK number starting with 0 to +44
      digits = '44' + digits.substring(1);
    }
    
    // Ensure it starts with + for Cognito's E.164 format
    return digits.startsWith('44') ? '+' + digits : '+44' + digits;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrors({});
    setGeneralError(null);
    setIsSubmitting(true);

    try {
      const validationErrors: Record<string, string> = {};

      if (!username.trim()) validationErrors.username = 'Username is required';
      if (!email.trim()) validationErrors.email = 'Email is required';
      if (!password) validationErrors.password = 'Password is required';
      if (!confirmPassword) validationErrors.confirmPassword = 'Please confirm your password';
      if (password !== confirmPassword) validationErrors.confirmPassword = 'Passwords do not match';

      if (password && !isPasswordStrong(password)) {
        validationErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
      }

      // Updated UK phone number validation
      if (phoneNumber && !/^(\+?44|0)[1-9]\d{8,10}$/.test(phoneNumber.replace(/\s|-/g, ''))) {
        validationErrors.phoneNumber = 'Please enter a valid UK phone number';
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setIsSubmitting(false);
        return;
      }

      console.log('Starting signup process...');

      // Extract domain from email and get company name
      const domain = email.includes('@') ? email.split('@')[1] : '';
      // Get company name from domain (remove .com, .co.uk, etc.)
      const extractedCompanyName = domain.split('.')[0] || '';
      // Capitalize first letter
      const formattedCompanyName = extractedCompanyName.charAt(0).toUpperCase() + extractedCompanyName.slice(1);
      
      const companyId = uuidv4();

      // Format phone number to E.164 format required by Cognito
      const formattedPhoneNumber = phoneNumber ? formatPhoneNumber(phoneNumber) : '';
      
      // Use provided company name or extract from email domain
      const finalCompanyName = companyName || formattedCompanyName;

      // Store company name in localStorage since we can't store it in Cognito
      localStorage.setItem('companyName', finalCompanyName);
      
      // Create attributes using STANDARD Cognito attribute names
      const attributes: Record<string, string> = {
        email,
        name: username, // Use the standard Cognito "name" attribute 
        'custom:companyId': companyId,
        'custom:userRole': 'User'
      };
      
      // Only include phone number if provided - use standard phone_number attribute
      if (formattedPhoneNumber) {
        attributes.phone_number = formattedPhoneNumber;
      }

      console.log('Signup attributes:', attributes);

      const result = await signUp(username, password, attributes);

      if (result.success) {
        localStorage.setItem('pendingConfirmation', username);
        localStorage.setItem(
          'signupData',
          JSON.stringify({
            email,
            companyId,
            timestamp: new Date().toISOString(),
          })
        );
        setGeneralError(null);
        setTimeout(() => {
          navigate(`/confirm-account?username=${encodeURIComponent(username)}`);
        }, 500);
      } else {
        setGeneralError(result.message || 'Signup failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setGeneralError(err.message || 'An unexpected error occurred during signup');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      <button
        onClick={toggleDarkMode}
        className={`absolute top-4 right-4 p-2 rounded-full z-10 ${isDarkMode ? 'bg-gray-800 text-yellow-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'} shadow-md transition-colors duration-300`}
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
      </button>

      <div className="hidden md:block md:w-1/2 bg-cover bg-center relative overflow-hidden">
        <div className={`absolute inset-0 ${isDarkMode ? 'bg-black/30' : 'bg-blue-900/20'} z-10`} style={{ backdropFilter: 'blur(2px)' }}></div>
        <img src={loginImage} alt="Drone imagery" className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center text-white p-8 max-w-md">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
              <h1 className="text-3xl font-bold mb-4 drop-shadow-lg">Welcome to PilotForce</h1>
              <p className="text-lg drop-shadow-md">Join our platform for comprehensive drone operations management</p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <motion.div
          className={`w-full max-w-md p-6 md:p-8 rounded-2xl shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} transition-colors duration-300`}
          initial="hidden"
          animate="visible"
        >
          <motion.h2 className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Create Account</motion.h2>
          <motion.p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Enter your information to create an account</motion.p>

          <AnimatePresence>
            {generalError && (
              <motion.div
                className="mb-4 p-4 rounded-lg bg-red-100/80 text-red-700 border border-red-200 flex items-start"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FiAlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{generalError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSignUp}>
            <div className="mb-4">
              <label htmlFor="username" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                    isDarkMode ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500 focus:ring-blue-500' : 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Choose a username"
                  required
                  disabled={isSubmitting}
                />
              </div>
              {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username}</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="email" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-blue-500'}`} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 w-full py-3 px-4 rounded-lg focus:ring-2 outline-none transition-all duration-300 ${
                    isDarkMode ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500 focus:ring-blue-500' : 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Enter your email"
                  required
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="phoneNumber" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Phone Number <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiPhone className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-blue-500'}`} />
                </div>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`pl-10 w-full py-3 px-4 rounded-lg focus:ring-2 outline-none transition-all duration-300 ${
                    isDarkMode ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500 focus:ring-blue-500' : 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="e.g. +44 123-456-7890"
                  disabled={isSubmitting}
                />
              </div>
              {errors.phoneNumber && <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="password" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-blue-500'}`} />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 w-full py-3 px-4 rounded-lg focus:ring-2 outline-none transition-all duration-300 ${
                    isDarkMode ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500 focus:ring-blue-500' : 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Create a strong password"
                  required
                  disabled={isSubmitting}
                />
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-blue-500'}`} />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-10 w-full py-3 px-4 rounded-lg focus:ring-2 outline-none transition-all duration-300 ${
                    isDarkMode ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500 focus:ring-blue-500' : 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Confirm your password"
                  required
                  disabled={isSubmitting}
                />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                isSubmitting ? 'cursor-not-allowed opacity-70' : 'transform hover:-translate-y-1 hover:shadow-lg'
              } ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Creating Account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
