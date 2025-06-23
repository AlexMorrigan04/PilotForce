import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiMail, FiCheck, FiAlertCircle, FiUser } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('User');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { user } = useAuth();

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole('User');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  // Validate email format
  const isValidEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!email || !isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Submit invitation to API
      const response = await axios.post(
        `${process.env.REACT_APP_API_ENDPOINT}/invitations`, 
        {
          email,
          role,
          companyId: user?.companyId,
          invitedBy: user?.id
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('idToken')}`
          }
        }
      );
      
      if (response.data.success) {
        setSuccess(true);
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
        
        // Close modal after a delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to send invitation');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If modal is closed, don't render anything
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <motion.div 
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 focus:outline-none"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
          
          {/* Modal Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Invite Team Member
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Send an invitation to join your company on PilotForce
              </p>
            </div>
            
            {success ? (
              <div className="text-center py-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <FiCheck className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Invitation Sent!</h3>
                <p className="text-sm text-gray-500">
                  An email has been sent to {email} with instructions to join your team.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm flex items-start">
                    <FiAlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                {/* Email Input */}
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="colleague@company.com"
                      required
                    />
                  </div>
                </div>
                
                {/* Role Selection */}
                <div className="mb-6">
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      id="role"
                      name="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    >
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                      {user?.role === 'SystemAdmin' && (
                        <option value="SystemAdmin">System Admin</option>
                      )}
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {role === 'Admin' ? 
                      'Admins can manage users, assets, and company settings' : 
                      role === 'SystemAdmin' ? 
                      'System Admins have full access to all features and companies' : 
                      'Users can view and interact with data but cannot manage system settings'
                    }
                  </p>
                </div>
                
                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InviteUserModal;