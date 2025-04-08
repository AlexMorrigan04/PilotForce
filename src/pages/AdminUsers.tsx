import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import UserTable from '../components/admin/UserTable';
import UserFilters from '../components/admin/UserFilters';
import { FiUserPlus, FiSearch, FiRefreshCw, FiDownload } from 'react-icons/fi';
import * as adminService from '../services/adminService';
import { validateAmplifyConfig } from '../utils/apiUtils';

interface User {
  id: string;
  username: string;
  email: string;
  company: string;
  companyId: string;
  role: string;
  status: string;
  lastLogin: string;
  isEnabled: boolean;
}

interface Company {
  id: string;
  name: string;
}

const AdminUsers: React.FC = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    company: '',
    role: '',
    status: ''
  });
  const navigate = useNavigate();

  // Verify Amplify configuration
  useEffect(() => {
    validateAmplifyConfig();
  }, []);

  // Verify admin status and load data
  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access this page');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return;
    }
    
    fetchUsers();
    fetchCompanies();
  }, [isAdmin, navigate]);

  // Fetch users from API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllUsers(filters);
      setUsers(response.users || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch companies for filters
  const fetchCompanies = async () => {
    try {
      const response = await adminService.getAllCompanies();
      setCompanies(response.companies || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  // Apply filters
  useEffect(() => {
    fetchUsers();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      company: '',
      role: '',
      status: ''
    });
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchTermLower) ||
      user.email.toLowerCase().includes(searchTermLower) ||
      user.company.toLowerCase().includes(searchTermLower) ||
      user.role.toLowerCase().includes(searchTermLower) ||
      user.status.toLowerCase().includes(searchTermLower)
    );
  });

  // Handle user selection for bulk actions
  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // User management actions
  const handleAddUser = () => {
    navigate('/admin/users/add');
  };

  const handleEditUser = (userId: string) => {
    navigate(`/admin/users/edit/${userId}`);
  };

  const handleViewUserDetails = (userId: string) => {
    navigate(`/admin/users/details/${userId}`);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        setLoading(true);
        await adminService.deleteUser(userId);
        // Update local state
        setUsers(users.filter(user => user.id !== userId));
        // Remove from selected users if present
        setSelectedUsers(selectedUsers.filter(id => id !== userId));
        alert('User deleted successfully');
      } catch (err: any) {
        console.error('Error deleting user:', err);
        setError(err.message || 'Failed to delete user');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleUserAccess = async (userId: string, isEnabled: boolean) => {
    try {
      setLoading(true);
      await adminService.toggleUserAccess(userId, isEnabled);
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isEnabled } : user
      ));
      alert(`User ${isEnabled ? 'enabled' : 'disabled'} successfully`);
    } catch (err: any) {
      console.error('Error toggling user access:', err);
      setError(err.message || `Failed to ${isEnabled ? 'enable' : 'disable'} user`);
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk actions
  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`)) {
      try {
        setLoading(true);
        
        // Process deletions sequentially
        for (const userId of selectedUsers) {
          await adminService.deleteUser(userId);
        }
        
        // Update local state
        setUsers(users.filter(user => !selectedUsers.includes(user.id)));
        setSelectedUsers([]);
        alert('Users deleted successfully');
      } catch (err: any) {
        console.error('Error deleting users:', err);
        setError(err.message || 'Failed to delete users');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkDisable = async () => {
    if (selectedUsers.length === 0) return;
    
    if (window.confirm(`Are you sure you want to disable ${selectedUsers.length} users?`)) {
      try {
        setLoading(true);
        
        // Process access changes sequentially
        for (const userId of selectedUsers) {
          await adminService.toggleUserAccess(userId, false);
        }
        
        // Update local state
        setUsers(users.map(user => 
          selectedUsers.includes(user.id) ? { ...user, isEnabled: false } : user
        ));
        alert('Users disabled successfully');
      } catch (err: any) {
        console.error('Error disabling users:', err);
        setError(err.message || 'Failed to disable users');
      } finally {
        setLoading(false);
      }
    }
  };

  // Export users to CSV
  const handleExportUsers = () => {
    const headers = ['Username', 'Email', 'Company', 'Role', 'Status', 'Enabled', 'Last Login'];
    
    const csvData = filteredUsers.map(user => [
      user.username,
      user.email,
      user.company,
      user.role,
      user.status,
      user.isEnabled ? 'Yes' : 'No',
      user.lastLogin
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'users.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AdminNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">View and manage system users</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button 
              onClick={handleAddUser}
              className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-white hover:bg-blue-700 focus:outline-none"
            >
              <FiUserPlus className="mr-2" />
              Add User
            </button>
            <button 
              onClick={handleExportUsers}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              <FiDownload className="mr-2" />
              Export CSV
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* User filters */}
        <UserFilters 
          companies={companies}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        {/* User management controls */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-64 mb-4 sm:mb-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={fetchUsers}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Refresh"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {selectedUsers.length > 0 && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center">
              <span className="mr-4 text-sm text-blue-800">
                {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
              </span>
              <button 
                onClick={handleBulkDisable}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
              >
                Disable
              </button>
              <button 
                onClick={handleBulkDelete}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          )}
          
          {/* User table */}
          <UserTable 
            users={filteredUsers}
            loading={loading}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            onToggleAccess={handleToggleUserAccess}
            onViewDetails={handleViewUserDetails}
            selectedUsers={selectedUsers}
            onSelectUser={handleSelectUser}
            onSelectAll={handleSelectAll}
          />
          
          {/* Pagination - could be implemented if needed */}
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredUsers.length}</span> of <span className="font-medium">{filteredUsers.length}</span> results
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminUsers;
