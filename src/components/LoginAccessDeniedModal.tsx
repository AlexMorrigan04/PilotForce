import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

export interface LoginAccessDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  username?: string; // Make username optional to support both authentication methods
  isNewDomain: boolean;
  companyName: string;
  approvalStatus: string;
}

const LoginAccessDeniedModal: React.FC<LoginAccessDeniedModalProps> = ({
  isOpen,
  onClose,
  email,
  username, // Keep username as a prop but it's now optional
  isNewDomain,
  companyName,
  approvalStatus
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full z-10 mx-auto overflow-hidden shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center text-red-500">
                    <FiAlertTriangle className="h-6 w-6 mr-2" />
                    <h3 className="text-lg font-medium">Access Denied</h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Your account with email <span className="font-medium text-gray-900 dark:text-white">{email}</span> requires approval before you can access the system.
                  </p>
                  
                  {isNewDomain && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      This appears to be the first account from <span className="font-medium text-gray-900 dark:text-white">{companyName}</span>. New company domains require administrative approval.
                    </p>
                  )}
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Current status: <span className="font-medium text-orange-500">{approvalStatus}</span>
                  </p>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Please contact your administrator or support for assistance.
                  </p>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={onClose}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                  >
                    I Understand
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LoginAccessDeniedModal;