import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMail, FiAlertCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';

interface EmailExistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

const EmailExistsModal: React.FC<EmailExistsModalProps> = ({ isOpen, onClose, email }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl z-10 w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="p-5 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold flex items-center text-gray-900 dark:text-white">
                <FiAlertCircle className="mr-2 text-red-500" />
                Account Already Exists
              </h3>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 flex items-center justify-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <FiMail className="h-8 w-8 text-red-500 dark:text-red-400" />
                </div>
              </div>
              
              <div className="text-center mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  An account with email <span className="font-semibold">{email}</span> already exists.
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Please sign in with your existing account or use a different email address to create a new account.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/login"
                  className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-center transition-colors"
                >
                  Go to Login
                </Link>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg text-center transition-colors"
                >
                  Try Different Email
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EmailExistsModal;
