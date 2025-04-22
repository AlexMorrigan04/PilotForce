import React from 'react';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiCheckCircle, FiX, FiMail, FiBriefcase } from 'react-icons/fi';

interface SignupApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailDomain: string;
  isNewDomain: boolean;
  companyName: string;
}

const SignupApprovalModal: React.FC<SignupApprovalModalProps> = ({
  isOpen,
  onClose,
  emailDomain,
  isNewDomain,
  companyName
}) => {
  if (!isOpen) return null;

  // Format company name for display, capitalize first letter
  const displayCompanyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
  
  // Set approval text based on whether this is a new domain or existing domain
  const approvalText = isNewDomain
    ? "Your account requires System Administrator approval."
    : `Your account requires approval from a ${displayCompanyName} Administrator.`;
    
  const waitingText = isNewDomain
    ? "Since you are the first user from your organization, a System Administrator will review your account."
    : `An administrator from ${displayCompanyName} will review your account and approve your access.`;

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
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-blue-100">
            <FiCheckCircle className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mt-4">Account Created Successfully</h3>
          <p className="text-sm text-gray-500 mt-2">{approvalText}</p>
        </div>
        
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <div className="flex items-center">
            <FiBriefcase className="h-5 w-5 text-gray-400 mr-2" />
            <h4 className="text-sm font-medium text-gray-700">Company Details</h4>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium">{displayCompanyName}</span>
            <span className="text-gray-500 ml-2">({emailDomain})</span>
          </p>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center">
              <FiAlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              <h4 className="text-sm font-medium text-gray-700">Approval Required</h4>
            </div>
            <p className="mt-1 text-sm text-gray-600">{waitingText}</p>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mb-4">
          You'll receive an email notification once your account has been approved. You can try logging in later to check your approval status.
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

export default SignupApprovalModal;