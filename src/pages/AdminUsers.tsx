import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/common/Navbar';
import { FiUsers, FiSearch, FiRefreshCw, FiFilter, FiX, FiUserPlus } from 'react-icons/fi';
import * as adminService from '../services/adminService';
import * as cognitoAdminService from '../services/cognitoAdminService';
import * as invitationService from '../services/invitationService';
import AdminUsersList from '../components/admin/AdminUsersList';
import InvitationModal from '../components/admin/InvitationModal';

interface User {
  id: string;
  email: string;
  name: string;
  status: string;
  role: string;
  enabled: boolean;
  createDate: string;
  rawUser?: any;
}

interface FiltersState {
  company: string;
  role: string;
  status: string;
}

interface Company {
  id: string;
  name: string;
}

interface UserStats {
  total: number;
  active: number;
  pending: number;
  disabled: number;
  admins: number;
}

// Add interface for raw user data
interface RawUser {
  CompanyId?: string;
  companyId?: string;
  company?: string;
  companyName?: string;
}

interface UserWithRaw extends User {
  rawUser?: RawUser;
}

const AdminUsers: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvitationModal, setShowInvitationModal] = useState<boolean>(false);
  const [formattedCompanies, setFormattedCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    pending: 0,
    disabled: 0,
    admins: 0
  });
  
  const [filters, setFilters] = useState<FiltersState>({
    company: '',
    role: '',
    status: ''
  });

  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access this page');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return;
    }

    fetchUsers();
  }, [isAdmin, navigate, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await cognitoAdminService.getAllUsers(filters);
      
      if (!response || !response.users) {
        throw new Error('Invalid API response format');
      }
      
      const mappedUsers = response.users.map((user: any) => ({
        id: user.userId || user.UserId || user.sub || user.username || user.Username,
        email: user.email || user.Email || '',
        name: user.name || user.Name || user.username || user.Username || user.email || user.Email || '',
        role: user.role || user.UserRole || user.custom_role || user.attributes?.['custom:role'] || 'User',
        status: user.status || user.Status || (user.enabled || user.Enabled ? 'ACTIVE' : 'INACTIVE'),
        enabled: user.enabled === undefined ? (user.Enabled === undefined ? true : user.Enabled) : user.enabled,
        createDate: user.createDate || user.CreatedAt || user.createdAt || new Date().toISOString(),
        rawUser: user
      }));

      setUsers(mappedUsers);

      // Calculate stats
      const newStats = mappedUsers.reduce((acc: UserStats, user: User) => {
        acc.total++;
        if (user.enabled) acc.active++;
        if (user.status.toLowerCase() === 'pending') acc.pending++;
        if (!user.enabled) acc.disabled++;
        if (user.role.toLowerCase().includes('admin')) acc.admins++;
        return acc;
      }, { total: 0, active: 0, pending: 0, disabled: 0, admins: 0 });

      setStats(newStats);
      
      // Update companies list
      const uniqueCompanies = [...new Set(mappedUsers.map((user: UserWithRaw) => {
        const companyId = user.rawUser?.CompanyId || user.rawUser?.companyId || '';
        const companyName = user.rawUser?.company || user.rawUser?.companyName || companyId;
        return companyId && companyName ? { id: companyId, name: companyName } : null;
      }))].filter((company): company is Company => company !== null);
      
      setFormattedCompanies(uniqueCompanies);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      company: '',
      role: '',
      status: ''
    });
  };

  const handleSendInvitation = async (email: string, companyId: string, companyName: string, role: string) => {
    try {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const inviterUserId = user?.id || user?.sub || '';

      await invitationService.sendInvitation(email, companyId, role, inviterUserId);
      await fetchUsers();
    } catch (error: any) {
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              User Management
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <button
              type="button"
              onClick={() => setShowInvitationModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiUserPlus className="mr-2" />
              Invite User
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-blue-100 rounded-md p-3">
                    <FiUsers className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-green-100 rounded-md p-3">
                    <FiUsers className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.active}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-yellow-100 rounded-md p-3">
                    <FiUsers className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.pending}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-red-100 rounded-md p-3">
                    <FiUsers className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Disabled</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.disabled}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-purple-100 rounded-md p-3">
                    <FiUsers className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Admins</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.admins}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                  Search
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="search"
                    id="search"
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Search users..."
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                  Company
                </label>
                <select
                  id="company"
                  name="company"
                  value={filters.company}
                  onChange={(e) => handleFilterChange('company', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Companies</option>
                  {formattedCompanies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Roles</option>
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                  <option value="CompanyAdmin">Company Admin</option>
                </select>
              </div>

              <div className="flex items-end space-x-3">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiX className="mr-2" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={fetchUsers}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiRefreshCw className="mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiX className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white shadow rounded-lg">
          <AdminUsersList onRefresh={fetchUsers} />
        </div>
      </div>

      {/* Invitation Modal */}
      <InvitationModal 
        show={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        onSubmit={handleSendInvitation}
        companies={formattedCompanies}
      />
    </div>
  );
};

export default AdminUsers;
