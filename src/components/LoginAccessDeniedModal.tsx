import React from 'react';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiX, FiBriefcase, FiAlertOctagon, FiClock, FiCheckCircle } from 'react-icons/fi';

interface LoginAccessDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  email?: string;
  isNewDomain: boolean;
  companyName: string;
  approvalStatus?: string;
}

const LoginAccessDeniedModal: React.FC<LoginAccessDeniedModalProps> = ({
  isOpen,
  onClose,
  username,
  email,
  isNewDomain,
  companyName,
  approvalStatus = 'PENDING'
}) => {
  if (!isOpen) return null;

  // Format company name for display, capitalize first letter if needed
  const displayCompanyName = companyName ? 
    (companyName.charAt(0).toUpperCase() + companyName.slice(1)) : 
    'your company';
  
  // Set approval text based on whether this is a new domain or existing domain
  const approvalText = isNewDomain
    ? "Your account requires System Administrator approval."
    : `Your account requires approval from a ${displayCompanyName} Administrator.`;
    
  const waitingText = isNewDomain
    ? "Since you are the first user from your organization, a System Administrator will review your account."
    : `An administrator from ${displayCompanyName} will review your account and approve your access.`;

  const getStatusIcon = () => {
    if (approvalStatus === 'REJECTED') {
      return <FiAlertOctagon className="h-8 w-8 text-red-600" />;
    } else if (approvalStatus === 'APPROVED') {
      return <FiCheckCircle className="h-8 w-8 text-green-600" />;
    } else {
      return <FiClock className="h-8 w-8 text-amber-600" />;
    }
  };

  const getStatusMessage = () => {
    if (approvalStatus === 'REJECTED') {
      return 'Your access request has been rejected. Please contact your administrator.';
    } else if (approvalStatus === 'APPROVED') {
      return 'Your account has been approved but is not yet activated. Please try again later or contact support.';
    } else {
      return 'Your account is pending approval.';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <motion.div
        className="relative bg-white rounded-lg max-w-md mx-auto p-6 shadow-xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <FiX className="h-5 w-5" />
        </button>
        
        <div className="text-center mb-5">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-100">
            {getStatusIcon()}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mt-4">Account Not Yet Active</h3>
          <p className="text-sm text-gray-500 mt-2">{getStatusMessage()}</p>
        </div>
        
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <div className="flex items-center">
            <FiBriefcase className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Account Details</span>
          </div>
          
          <div className="mt-2 space-y-2 text-sm">
            <div className="flex items-start">
              <span className="text-gray-500 w-24">Username:</span>
              <span className="font-medium text-gray-800">{username}</span>
            </div>
            {email && (
              <div className="flex items-start">
                <span className="text-gray-500 w-24">Email:</span>
                <span className="font-medium text-gray-800">{email}</span>
              </div>
            )}
            {companyName && (
              <div className="flex items-start">
                <span className="text-gray-500 w-24">Company:</span>
                <span className="font-medium text-gray-800">{displayCompanyName}</span>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center">
              <FiAlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              <h4 className="text-sm font-medium text-gray-700">Approval Required</h4>
            </div>
            <p className="mt-1 text-sm text-gray-600">{waitingText}</p>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mb-4">
          You'll receive an email notification once your account has been approved.
          You can try logging in later to check your approval status.
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          I Understand
        </button>
      </motion.div>
    </div>
  );
};

export default LoginAccessDeniedModal;