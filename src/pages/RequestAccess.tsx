import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMoon, FiSun, FiAlertCircle, FiCheckCircle, FiMail, FiBriefcase, FiMessageSquare } from 'react-icons/fi';
import axios from 'axios';

// Formspree endpoint
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mqaqgavw";

const RequestAccess: React.FC = () => {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Check for error message from redirect
  useEffect(() => {
    // Check for email in navigation state
    if (location.state) {
      if (location.state.error) {
        setError(location.state.error);
      }
      if (location.state.email) {
        setEmail(location.state.email);
      }
    }
    
    // Check for email in URL query parameters
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    
    // Check for stored pending email
    const pendingEmail = localStorage.getItem('pendingEmail');
    if (pendingEmail && !email) {
      setEmail(pendingEmail);
      // Clear the stored email after using it
      localStorage.removeItem('pendingEmail');
    }
    
    // Clear any remaining auth tokens to prevent unwanted redirects
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    sessionStorage.removeItem('idToken');
    sessionStorage.removeItem('accessToken');
  }, [location]);

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

  // Validate email format
  const isValidEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  // Handle form submission with Formspree
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!email || !isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!companyName) {
      setError('Please enter your company name');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Send form data to Formspree
      const response = await axios.post(
        FORMSPREE_ENDPOINT, 
        {
          email,
          companyName,
          message: message || "No additional message provided",
          _subject: `PilotForce Access Request from ${companyName}`
        },
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (response.status === 200 || response.status === 201) {
        setSuccess(true);
        // Clear form
        setEmail('');
        setCompanyName('');
        setMessage('');
      } else {
        setError('Failed to submit access request. Please try again later.');
      }
    } catch (err: any) {
      setError('Failed to submit form. Please try again later or contact support directly.');
    } finally {
      setIsSubmitting(false);
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
          {success ? (
            <div className="p-8">
              <div className="flex flex-col items-center mb-6 text-center">
                <div className={`w-16 h-16 mb-4 rounded-full ${
                  isDarkMode ? 'bg-green-600' : 'bg-green-500'
                } flex items-center justify-center`}>
                  <FiCheckCircle className="h-8 w-8 text-white" />
                </div>
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Request Submitted
                </h2>
                <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Thank you for your interest in PilotForce. We've received your access request
                  and will review it as soon as possible.
                </p>
              </div>
              
              <div className={`p-4 rounded-lg mb-6 ${
                isDarkMode 
                  ? 'bg-gray-700 border border-gray-600' 
                  : 'bg-gray-50 border border-gray-100'
              }`}>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  We'll send you an email when your request has been approved. You'll
                  receive a personal invitation with instructions to access the system.
                </p>
              </div>
              
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => navigate('/login')}
                  className={`px-4 py-2 rounded-md font-medium text-sm ${
                    isDarkMode 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  }`}
                >
                  Return to Login
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8">
              {error && (
                <div className={`p-4 rounded-lg mb-6 ${
                  isDarkMode 
                    ? 'bg-red-900/30 border border-red-800' 
                    : 'bg-red-50 border border-red-100'
                }`}>
                  <div className="flex">
                    <FiAlertCircle className={`h-5 w-5 ${isDarkMode ? 'text-red-400' : 'text-red-500'} mr-2 flex-shrink-0`} />
                    <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                      {error}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center mb-6">
                <div className={`w-14 h-14 mb-4 rounded-full ${
                  isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500'
                } flex items-center justify-center`}>
                  <svg xmlns="" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Request Access
                </h2>
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Fill out the form below to request access to PilotForce
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className={`block text-sm font-medium mb-1.5 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <FiMail className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:outline-none ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-600' 
                          : 'bg-white border-gray-300 text-gray-900 focus:ring-indigo-500'
                      }`}
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                </div>
                
                {/* Company Name Input */}
                <div>
                  <label htmlFor="companyName" className={`block text-sm font-medium mb-1.5 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Company Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <FiBriefcase className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:outline-none ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-600' 
                          : 'bg-white border-gray-300 text-gray-900 focus:ring-indigo-500'
                      }`}
                      placeholder="Your Company Ltd"
                      required
                    />
                  </div>
                </div>
                
                {/* Message Input */}
                <div>
                  <label htmlFor="message" className={`block text-sm font-medium mb-1.5 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Message (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 top-3 pl-3.5 flex items-start pointer-events-none">
                      <FiMessageSquare className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <textarea
                      id="message"
                      name="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:outline-none ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-600' 
                          : 'bg-white border-gray-300 text-gray-900 focus:ring-indigo-500'
                      }`}
                      placeholder="Additional details about your request..."
                    />
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-2.5 px-4 border rounded-lg font-medium focus:outline-none focus:ring-2 ${
                      isDarkMode 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 focus:ring-indigo-500' 
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500 focus:ring-indigo-400'
                    } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
                
                {/* Back to login link */}
                <div className="mt-4 text-center">
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Already have an invitation?{" "}
                    <Link 
                      to="/login" 
                      className={`font-medium ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'}`}
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default RequestAccess;