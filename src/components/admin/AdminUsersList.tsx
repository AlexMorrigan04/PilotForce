import React, { useState, useEffect, useCallback } from 'react';
import * as adminService from '../../services/adminService';

interface User {
  userId: string;
  username: string;
  email: string;
  companyId?: string;
  companyName?: string; 
  status: string;
  createdAt: string;
  hasAccess: boolean;
  role?: string;
}

const AdminUsersList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState<{[key: string]: boolean}>({});

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get users from the API
      const response = await adminService.getAllUsers();
      
      // Process the response to match our User interface
      const formattedUsers = response.map((user: any) => ({
        userId: user.userId || user.username || user.sub,
        username: user.username || user.email || 'Unknown',
        email: user.email || 'No email',
        companyId: user.companyId || user['custom:companyId'] || 'N/A',
        companyName: user.companyName || 'Unknown Company',
        status: user.status || 'CONFIRMED',
        createdAt: user.createdAt || user.createDate || new Date().toISOString(),
        hasAccess: user.hasAccess !== false, // default to true if not specified
        role: user.role || user['custom:role'] || 'User'
      }));

      setUsers(formattedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleUserAccess = async (userId: string, currentStatus: boolean) => {
    try {
      setIsProcessing(prev => ({ ...prev, [userId]: true }));
      
      // Call the API to toggle access
      await adminService.toggleUserAccess(userId, currentStatus);
      
      // Update the local state
      setUsers(users.map(user => 
        user.userId === userId 
          ? { ...user, hasAccess: !currentStatus } 
          : user
      ));
    } catch (err) {
      console.error(`Error toggling access for user ${userId}:`, err);
      setError(`Failed to update access for user. Please try again.`);
    } finally {
      setIsProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.companyName && user.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      selectedStatus === 'all' || 
      (selectedStatus === 'active' && user.hasAccess) ||
      (selectedStatus === 'inactive' && !user.hasAccess);
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-gray-700">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{error}</p>
        <button 
          onClick={fetchUsers}
          className="mt-2 bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <h2 className="text-2xl font-semibold mb-4 md:mb-0">Manage Users</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              className="border rounded-lg px-4 py-2 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg 
              className="absolute right-3 top-3 h-5 w-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <select
            className="border rounded-lg px-4 py-2"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Users</option>
            <option value="active">Active Users</option>
            <option value="inactive">Inactive Users</option>
          </select>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
          <p>No users found matching your criteria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.userId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="bg-blue-100 rounded-full h-10 w-10 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">{user.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.companyName || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{user.companyId || 'No ID'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 
                      user.status === 'FORCE_CHANGE_PASSWORD' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.hasAccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.hasAccess ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      className={`mr-2 px-3 py-1 rounded ${
                        user.hasAccess 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      } transition`}
                      onClick={() => toggleUserAccess(user.userId, user.hasAccess)}
                      disabled={isProcessing[user.userId]}
                    >
                      {isProcessing[user.userId] ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing
                        </span>
                      ) : (
                        <span>{user.hasAccess ? 'Disable' : 'Enable'}</span>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsersList;
