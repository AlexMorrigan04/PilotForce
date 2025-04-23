import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiMoon, FiSun, FiPhone, FiBriefcase, FiAlertCircle } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import SignupApprovalModal from '../components/SignupApprovalModal';
import EmailExistsModal from '../components/EmailExistsModal';

const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

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
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isNewDomain, setIsNewDomain] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [detectedCompanyName, setDetectedCompanyName] = useState('');
  const [showEmailExistsModal, setShowEmailExistsModal] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Calculate password strength when password changes
  useEffect(() => {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    setPasswordStrength(strength);
  }, [password]);

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

  const checkEmailDomain = async (email: string) => {
    if (!email.includes('@')) return;

    const domain = email.split('@')[1];

    try {
      // This would ideally call an API to check if the domain exists in your system
      // For now, we'll simulate with a simple check of common domains
      const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const isCommonDomain = commonDomains.includes(domain.toLowerCase());

      // For demonstration purposes:
      // - Common email providers are treated as "new" domains requiring system admin approval
      // - Custom/corporate domains are treated as existing company domains
      setIsNewDomain(!isCommonDomain);

      // Extract company name from domain (for display purposes)
      const extractedCompany = domain.split('.')[0];
      const formattedCompany = extractedCompany.charAt(0).toUpperCase() + extractedCompany.slice(1);
      setDetectedCompanyName(formattedCompany);

    } catch (error) {
      console.error('Error checking email domain:', error);
      setIsNewDomain(true); // Default to treating as new domain if check fails
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrors({});
    setGeneralError(null);
    setIsSubmitting(true);

    try {
      const validationErrors: Record<string, string> = {};

      // Validate required fields
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
        'custom:companyId': companyId
      };

      // Only include phone number if provided - use standard phone_number attribute
      if (formattedPhoneNumber) {
        attributes.phone_number = formattedPhoneNumber;
      }

      console.log('Signup attributes:', attributes);

      // Check if this is a new company domain or existing company domain
      await checkEmailDomain(email);

      // Call signUp and store the result
      const result = await signUp(username, password, attributes);
      console.log('Signup result:', result);

      // FOCUSED UPDATE: First check specifically for email exists condition regardless of success flag
      if (result.type === 'EmailExistsException' || 
          (result.message && (
            result.message.toLowerCase().includes('email already exists') || 
            result.message.toLowerCase().includes('account with email')
          ))
      ) {
        // Always show email exists modal if that's the error, regardless of success flag
        console.log('Email already exists detected, showing email exists modal');
        setShowEmailExistsModal(true);
        setIsSubmitting(false);
        return;
      }

      // If we get here, it wasn't an email exists error, proceed as normal
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
        
        // Store detected company name for the modal
        const domainBasedCompanyName = formattedCompanyName;
        localStorage.setItem('detectedCompanyName', detectedCompanyName || domainBasedCompanyName);
        localStorage.setItem('isNewDomain', String(isNewDomain));
        
        // Show the approval modal
        setShowApprovalModal(true);
      } else {
        // Handle other errors
        setGeneralError(result.message || 'Signup failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      
      // FOCUSED UPDATE: Also check for email exists pattern in caught exceptions
      if (err.message?.toLowerCase().includes('email already exists') || 
          err.message?.toLowerCase().includes('account with email') || 
          err.code === 'EmailExistsException' ||
          err.type === 'EmailExistsException') {
        console.log('Email already exists exception caught, showing modal');
        setShowEmailExistsModal(true);
      } else {
        setGeneralError(err.message || 'An unexpected error occurred during signup');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-screen py-10 ${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
      <button
        onClick={toggleDarkMode}
        className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
          isDarkMode 
            ? 'bg-gray-800 text-yellow-300 hover:bg-gray-700' 
            : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
        }`}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? <FiSun className="h-6 w-6" /> : <FiMoon className="h-6 w-6" />}
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
            <div className="flex flex-col items-center mb-6">
              <div className={`w-14 h-14 mb-4 rounded-full ${isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500'} flex items-center justify-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
              </div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Create an account
              </h2>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Join PilotForce to get started
              </p>
            </div>

            <AnimatePresence>
              {generalError && (
                <motion.div
                  className="mb-4 p-4 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 flex items-start"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiAlertCircle className="mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-sm">{generalError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSignUp}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <FiUser className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`pl-10 w-full py-2.5 px-4 rounded-lg outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                          : 'bg-white text-gray-900 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      }`}
                      placeholder="johndoe"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.username && 
                    <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.username}</p>
                  }
                </div>

                <div>
                  <label htmlFor="email" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (e.target.value.includes('@')) {
                          checkEmailDomain(e.target.value);
                        }
                      }}
                      className={`pl-10 w-full py-2.5 px-4 rounded-lg outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                          : 'bg-white text-gray-900 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      }`}
                      placeholder="john@example.com"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.email && 
                    <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.email}</p>
                  }
                </div>

                <div>
                  <label htmlFor="phoneNumber" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Phone Number <span className="text-sm font-normal opacity-70">(optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <FiPhone className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={`pl-10 w-full py-2.5 px-4 rounded-lg outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                          : 'bg-white text-gray-900 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      }`}
                      placeholder="+44 7700 900000"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.phoneNumber && 
                    <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.phoneNumber}</p>
                  }
                </div>

                <div>
                  <label htmlFor="companyName" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Company Name <span className="text-sm font-normal opacity-70">(optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <FiBriefcase className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={`pl-10 w-full py-2.5 px-4 rounded-lg outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                          : 'bg-white text-gray-900 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      }`}
                      placeholder="Acme Inc."
                      disabled={isSubmitting}
                    />
                  </div>
                  {!companyName && (
                    <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      If not provided, we'll use your email domain
                    </p>
                  )}
                  {errors.companyName && 
                    <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.companyName}</p>
                  }
                </div>

                <div>
                  <label htmlFor="password" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <FiLock className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-10 w-full py-2.5 px-4 rounded-lg outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                          : 'bg-white text-gray-900 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      }`}
                      placeholder="••••••••••"
                      disabled={isSubmitting}
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
                  
                  {/* Password strength meter */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div className={`${strengthColors[passwordStrength-1] || 'bg-gray-200'}`} style={{ width: `${passwordStrength * 25}%` }}></div>
                      </div>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Strength: {strengthLabels[passwordStrength-1] || 'Too short'}
                      </p>
                    </div>
                  )}
                  
                  {errors.password && 
                    <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.password}</p>
                  }
                </div>

                <div>
                  <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <FiLock className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-10 w-full py-2.5 px-4 rounded-lg outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                          : 'bg-white text-gray-900 border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      }`}
                      placeholder="••••••••••"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none ${
                        isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                      }`}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && 
                    <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{errors.confirmPassword}</p>
                  }
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 mt-4 px-4 rounded-lg font-medium transition-all ${
                    isSubmitting 
                      ? 'cursor-not-allowed opacity-70'
                      : isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    'Create account'
                  )}
                </button>
              </div>
            </form>
          </div>
          
          <div className={`px-8 py-4 rounded-b-2xl text-center text-sm ${isDarkMode ? 'bg-gray-750 text-gray-400 border-t border-gray-700' : 'bg-slate-50 text-gray-600 border-t border-gray-100'}`}>
            Already have an account?{' '}
            <Link 
              to="/login" 
              className={`font-medium ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'} transition-colors`}
            >
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
      
      {/* Signup approval modal */}
      <SignupApprovalModal
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          navigate('/login');
        }}
        emailDomain={email.split('@')[1] || ''}
        isNewDomain={isNewDomain}
        companyName={detectedCompanyName || email.split('@')[1]?.split('.')[0] || 'your company'}
      />
      
      {/* Email already exists modal */}
      <EmailExistsModal
        isOpen={showEmailExistsModal}
        onClose={() => {
          setShowEmailExistsModal(false);
          setErrors({
            ...errors,
            email: 'This email is already registered. Please use a different email or sign in instead.'
          });
        }}
        email={email}
      />
    </div>
  );
};

export default Signup;
