import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/common/Navbar';
import { FiArrowLeft, FiMail, FiUser, FiClock, FiUserPlus, FiRefreshCw } from 'react-icons/fi';
import * as adminService from '../services/adminService';
import type { Company, CompanyUser } from '../services/adminService';
import UserDetailsModal from '../components/modals/UserDetailsModal';
import CompanyInvitationModal from '../components/CompanyInvitationModal';

const CompanyUsers: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);

  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access this page');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return;
    }

    loadCompanyUsers();
  }, [isAdmin, companyId, navigate]);

  const loadCompanyUsers = async () => {
    try {
      setRefreshing(true);
      const response = await adminService.getCompanyUsers(companyId || '');
      if (response.success) {
        setCompany(response.company);
        setUsers(response.users);
        setError(null);
      } else {
        setError(response.message || 'Failed to load company users');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading company users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'active': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'disabled': 'bg-red-100 text-red-800',
      'invited': 'bg-blue-100 text-blue-800'
    };
    return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const handleViewDetails = (user: CompanyUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  const handleInviteUser = async (email: string, role: string) => {
    try {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const inviterUserId = user?.id || user?.sub || '';

      await adminService.sendInvitation(email, companyId || '', role, inviterUserId);
      await loadCompanyUsers(); // Refresh the list after successful invitation
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                to="/admin/companies"
                className="text-blue-600 hover:text-blue-800 inline-flex items-center mb-4"
              >
                <FiArrowLeft className="mr-1" /> Back to Companies
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                {company?.Name} - Users
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage users for {company?.Name}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadCompanyUsers}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                disabled={refreshing}
              >
                <FiRefreshCw className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                <FiUserPlus className="mr-2" />
                Invite User
              </button>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Company ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{company?.CompanyId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(company?.Status || '')}`}>
                    {company?.Status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email Domain</dt>
                <dd className="mt-1 text-sm text-gray-900">{company?.EmailDomain || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(company?.CreatedAt || '').toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Users ({users.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <FiUser className="h-6 w-6 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name || 'No name'}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(user.status)}`}>
                        {user.invitationStatus === 'Pending' ? 'Invited' : user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewDetails(user)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View Details
                      </button>
                      {user.invitationStatus === 'Pending' && (
                        <button
                          onClick={() => {/* Implement resend invitation */}}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Resend Invite
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="text-center py-8">
              <FiUser className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by inviting users to this company.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  <FiUserPlus className="mr-2" />
                  Invite User
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add UserDetailsModal */}
      {selectedUser && (
        <UserDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          user={selectedUser}
        />
      )}

      {/* Add CompanyInvitationModal */}
      <CompanyInvitationModal
        show={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleInviteUser}
        companyId={companyId || ''}
        companyName={company?.Name || ''}
      />
    </div>
  );
};

export default CompanyUsers; 