import React from 'react';
import { FiX, FiMail, FiClock, FiUser, FiKey, FiUserCheck } from 'react-icons/fi';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    userId: string;
    email: string;
    name: string;
    status: string;
    role: string;
    createdAt: string;
    invitationStatus: string;
    inviteCode?: string;
    invitedBy?: string;
    expiresAt?: string;
  };
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'DISABLED': 'bg-red-100 text-red-800',
      'ACCEPTED': 'bg-green-100 text-green-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                Basic Information
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <FiUser className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-sm text-gray-900">{user.name || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <FiMail className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <FiUserCheck className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Role</p>
                    <p className="text-sm text-gray-900">{user.role}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Invitation Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                Invitation Details
              </h3>
              
              <div className="space-y-3">
                {user.inviteCode && (
                  <div className="flex items-center">
                    <FiKey className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Invite Code</p>
                      <p className="text-sm text-gray-900">{user.inviteCode}</p>
                    </div>
                  </div>
                )}

                {user.invitedBy && (
                  <div className="flex items-center">
                    <FiUser className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Invited By</p>
                      <p className="text-sm text-gray-900">{user.invitedBy}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center">
                  <FiClock className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created At</p>
                    <p className="text-sm text-gray-900">{formatDate(user.createdAt)}</p>
                  </div>
                </div>

                {user.expiresAt && (
                  <div className="flex items-center">
                    <FiClock className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Expires At</p>
                      <p className="text-sm text-gray-900">{formatDate(user.expiresAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal; 