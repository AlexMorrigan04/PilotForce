import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  FiUserPlus, FiRefreshCw, FiTrash2, FiAlertCircle, 
  FiMail, FiCalendar, FiClock, FiCheckCircle, FiXCircle 
} from 'react-icons/fi';
import axios from 'axios';
import InviteUserModal from '../components/InviteUserModal';

interface Invitation {
  invitationId: string;
  email: string;
  companyId: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  invitedBy: string;
  acceptedAt?: string;
}

const ManageInvitations: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Check if user is authorized to access this page
  useEffect(() => {
    if (isAuthenticated === false) {
      navigate('/login');
    } else if (user && !['Admin', 'SystemAdmin'].includes(user.role)) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, user, navigate]);
  
  // Fetch invitations
  const fetchInvitations = async () => {
    if (!user || !user.companyId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_ENDPOINT}/invitations/${user.companyId}`, 
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('idToken')}`
          }
        }
      );
      
      if (response.data.success) {
        setInvitations(response.data.invitations);
      } else {
        setError(response.data.message || 'Failed to fetch invitations');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch invitations');
    } finally {
      setLoading(false);
    }
  };
  
  // Load invitations on mount
  useEffect(() => {
    if (user && user.companyId) {
      fetchInvitations();
    }
  }, [user]);
  
  // Handle resending an invitation
  const handleResendInvitation = async (invitationId: string) => {
    setProcessingInvitation(invitationId);
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_ENDPOINT}/invitations/${invitationId}/resend`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('idToken')}`
          }
        }
      );
      
      if (response.data.success) {
        // Refresh the invitations list
        await fetchInvitations();
      } else {
        setError(response.data.message || 'Failed to resend invitation');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to resend invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };
  
  // Handle deleting an invitation
  const handleDeleteInvitation = async (invitationId: string) => {
    if (!window.confirm('Are you sure you want to delete this invitation?')) {
      return;
    }
    
    setProcessingInvitation(invitationId);
    
    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_API_ENDPOINT}/invitations/${invitationId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('idToken')}`
          }
        }
      );
      
      if (response.data.success) {
        // Refresh the invitations list
        await fetchInvitations();
      } else {
        setError(response.data.message || 'Failed to delete invitation');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };
  
  // Filter invitations by status
  const filteredInvitations = invitations.filter(invitation => {
    if (filterStatus === 'all') return true;
    return invitation.status === filterStatus;
  });
  
  // Display badge based on invitation status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FiClock className="mr-1" size={12} />
            Pending
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FiCheckCircle className="mr-1" size={12} />
            Accepted
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <FiXCircle className="mr-1" size={12} />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Invitations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Invite team members and manage existing invitations
          </p>
        </div>
        
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="mt-4 md:mt-0 flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <FiUserPlus className="mr-2" />
          Invite User
        </button>
      </div>
      
      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 flex items-start">
          <FiAlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {/* Filter Controls */}
      <div className="mb-6 flex items-center">
        <span className="text-sm text-gray-700 mr-3">Filter:</span>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filterStatus === 'all' 
                ? 'bg-indigo-100 text-indigo-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filterStatus === 'PENDING' 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('ACCEPTED')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filterStatus === 'ACCEPTED' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setFilterStatus('EXPIRED')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filterStatus === 'EXPIRED' 
                ? 'bg-gray-200 text-gray-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Expired
          </button>
        </div>
        
        <div className="ml-auto">
          <button
            onClick={fetchInvitations}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Invitations Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner-border inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] text-indigo-600 motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"></div>
            <p className="mt-2 text-sm text-gray-500">Loading invitations...</p>
          </div>
        ) : filteredInvitations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">
              {invitations.length === 0 
                ? 'No invitations have been sent yet.' 
                : 'No invitations match the current filter.'}
            </p>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FiUserPlus className="mr-2" />
              Invite User
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredInvitations.map((invitation) => {
              // Parse dates for display
              const createdDate = new Date(invitation.createdAt);
              const expiresDate = new Date(invitation.expiresAt);
              const now = new Date();
              const isExpired = expiresDate < now && invitation.status === 'PENDING';
              
              // Determine if invitation is expired but not marked as such
              if (isExpired && invitation.status === 'PENDING') {
                invitation.status = 'EXPIRED';
              }
              
              return (
                <li key={invitation.invitationId} className="px-6 py-5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
                          <FiMail className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-indigo-600">{invitation.email}</p>
                          <div className="flex items-center mt-1">
                            <p className="text-xs text-gray-500 mr-2">Role: {invitation.role}</p>
                            {renderStatusBadge(invitation.status)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <FiCalendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                          <span>Sent: {format(createdDate, 'PP')}</span>
                        </div>
                        {invitation.status === 'PENDING' && (
                          <div className="flex items-center">
                            <FiClock className="flex-shrink-0 mr-1.5 h-4 w-4" />
                            <span>Expires: {formatDistanceToNow(expiresDate, { addSuffix: true })}</span>
                          </div>
                        )}
                        {invitation.status === 'ACCEPTED' && invitation.acceptedAt && (
                          <div className="flex items-center">
                            <FiCheckCircle className="flex-shrink-0 mr-1.5 h-4 w-4 text-green-500" />
                            <span>Accepted: {formatDistanceToNow(new Date(invitation.acceptedAt), { addSuffix: true })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      {invitation.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleResendInvitation(invitation.invitationId)}
                            disabled={processingInvitation === invitation.invitationId}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <FiRefreshCw className={`mr-1.5 h-4 w-4 ${processingInvitation === invitation.invitationId ? 'animate-spin' : ''}`} />
                            Resend
                          </button>
                          <button
                            onClick={() => handleDeleteInvitation(invitation.invitationId)}
                            disabled={processingInvitation === invitation.invitationId}
                            className="inline-flex items-center px-3 py-1 border border-red-300 text-sm leading-5 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <FiTrash2 className="mr-1.5 h-4 w-4" />
                            Cancel
                          </button>
                        </>
                      )}
                      {invitation.status !== 'PENDING' && (
                        <button
                          onClick={() => handleDeleteInvitation(invitation.invitationId)}
                          disabled={processingInvitation === invitation.invitationId}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <FiTrash2 className="mr-1.5 h-4 w-4" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      
      {/* Invite User Modal */}
      <InviteUserModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onSuccess={fetchInvitations}
      />
    </div>
  );
};

export default ManageInvitations;