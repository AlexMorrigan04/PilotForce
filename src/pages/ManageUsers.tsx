import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getUser } from '../utils/localStorage';
import { useNavigate } from 'react-router-dom';
import { securityAuditLogger } from '../utils/securityAuditLogger';

interface CompanyUser {
  UserId: string;
  Username: string;
  Email: string;
  Name?: string;
  PhoneNumber?: string;
  UserRole: string;
  Status: string;
  CreatedAt: string;
  CompanyId: string;
  // Add new fields from DynamoDB
  Address?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
  ProfileImageUrl?: string;
  Department?: string;
  Position?: string;
  PreferredCommunication?: string;
  DateOfBirth?: string;
  Bio?: string;
  Skills?: string[];
  Certifications?: string[];
  IsEnabled?: boolean;
  LastLogin?: string;
  UpdatedAt?: string;
  [key: string]: any; // Allow any additional fields from DynamoDB
}

const ManageUsers: React.FC = () => {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formRole, setFormRole] = useState('');
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const userInfo = getUser();
  const isAdmin = userInfo?.role === 'Admin' || userInfo?.role === 'AccountAdmin';
  
  useEffect(() => {
    // Don't redirect while auth is still loading
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
    } else if (!authLoading && isAdmin) {
      fetchCompanyUsers();
    }
  }, [isAdmin, authLoading, navigate]);
  
  const fetchCompanyUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentUser = getUser();
      if (!currentUser || !currentUser.companyId) {
        setError("Unable to determine company ID");
        return;
      }
      
      const companyId = currentUser.companyId;
      const username = localStorage.getItem('auth_username');
      const password = localStorage.getItem('auth_password');
      
      if (!username || !password) {
        setError("Authentication credentials not found");
        return;
      }
      
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/companies/${companyId}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch company users: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Process the response data
      let usersData: CompanyUser[] = [];
      if (responseData.users && Array.isArray(responseData.users)) {
        usersData = responseData.users;
      } else if (responseData.body) {
        const parsedBody = typeof responseData.body === 'string' 
          ? JSON.parse(responseData.body) 
          : responseData.body;
          
        if (parsedBody.users && Array.isArray(parsedBody.users)) {
          usersData = parsedBody.users;
        }
      }
      
      // Sort users by role and name
      const sortedUsers = usersData.sort((a: CompanyUser, b: CompanyUser) => {
        const isAdminA = a.UserRole?.toLowerCase() === 'admin' || a.UserRole?.toLowerCase() === 'administrator';
        const isAdminB = b.UserRole?.toLowerCase() === 'admin' || b.UserRole?.toLowerCase() === 'administrator';
        
        if (isAdminA && !isAdminB) {
          return -1;
        }
        if (!isAdminA && isAdminB) {
          return 1;
        }
        
        const nameA = a.Name || a.Username || '';
        const nameB = b.Name || b.Username || '';
        return nameA.localeCompare(nameB);
      });
      
      setUsers(sortedUsers);
    } catch (err: any) {
      setError(err.message || 'Failed to load company users');
      
      // Set mock data for development
      if (process.env.NODE_ENV === 'development') {
        setUsers([
          {
            UserId: '1',
            Username: 'admin_user',
            Email: 'admin@example.com',
            Name: 'Admin User',
            PhoneNumber: '+1234567890',
            UserRole: 'Admin',
            Status: 'CONFIRMED',
            CreatedAt: new Date().toISOString(),
            CompanyId: 'company123'
          },
          {
            UserId: '2',
            Username: 'regular_user',
            Email: 'user@example.com',
            Name: 'Regular User',
            UserRole: 'User',
            Status: 'CONFIRMED',
            CreatedAt: new Date().toISOString(),
            CompanyId: 'company123'
          }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: CompanyUser) => {
    setSelectedUser(user);
    setFormRole(user.UserRole);
    setIsEditing(true);
  };
  
  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    
    try {
      setIsLoading(true);
      
      const currentUser = getUser();
      if (!currentUser || !currentUser.companyId) {
        setError("Unable to determine company ID");
        return;
      }
      
      const username = localStorage.getItem('auth_username');
      const password = localStorage.getItem('auth_password');
      
      if (!username || !password) {
        setError("Authentication credentials not found");
        return;
      }
      
      // This is where you would make an API call to update the user's role
      // For now, we'll just update the local state
      
      const updatedUsers = users.map(user => 
        user.UserId === selectedUser.UserId 
          ? {...user, UserRole: formRole}
          : user
      );
      
      setUsers(updatedUsers);
      setIsEditing(false);
      setSelectedUser(null);
      
      securityAuditLogger.logPermissionChange(
        user?.userId || user?.id || 'unknown',
        selectedUser.userId || selectedUser.id || 'unknown',
        'Update User Role',
        { newRole: formRole },
        true
      );
      
    } catch (err: any) {
      securityAuditLogger.logPermissionChange(
        user?.userId || user?.id || 'unknown',
        selectedUser.userId || selectedUser.id || 'unknown',
        'Update User Role',
        { error: err.message, attemptedRole: formRole },
        false
      );
      setError(err.message || 'Failed to update user role');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getRoleBadgeStyle = (role: string) => {
    const lowerRole = role.toLowerCase();
    if (lowerRole.includes('admin')) {
      return 'bg-purple-100 text-purple-800';
    } else if (lowerRole.includes('manager')) {
      return 'bg-blue-100 text-blue-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'confirmed') {
      return 'bg-green-100 text-green-800';
    } else if (lowerStatus === 'unconfirmed') {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-4 shadow-md">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold mb-2">Manage Users</h1>
          <p className="text-blue-100">
            View and manage users in your organization
          </p>
        </div>
      </div>
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Company Users</h2>
            <p className="text-sm text-gray-500">All users associated with your company</p>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
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
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.UserId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.ProfileImageUrl ? (
                              <img 
                                src={user.ProfileImageUrl} 
                                alt={`${user.Username}'s profile`} 
                                className="h-10 w-10 rounded-full"
                                onError={(e) => {
                                  // Fallback to initials if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                  }
                                }}
                              />
                            ) : (
                              <div className="bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold h-10 w-10">
                                {(user.Name || user.Username || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.Name || user.Username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.Email}
                            </div>
                            {user.Department && (
                              <div className="text-xs text-gray-400">
                                {user.Department} • {user.Position || 'Staff'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeStyle(user.UserRole)}`}>
                          {user.UserRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(user.Status)}`}>
                          {user.Status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.CreatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Edit
                        </button>
                        {user.Status.toLowerCase() === 'unconfirmed' && (
                          <button 
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {isEditing && selectedUser && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit User Role</h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">User</p>
                <p className="font-medium">{selectedUser.Name || selectedUser.Username}</p>
                <p className="text-sm text-gray-500">{selectedUser.Email}</p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role">
                  Role
                </label>
                <select
                  id="role"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                >
                  <option value="User">User</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              
              {/* Add new fields for editing */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="department">
                  Department
                </label>
                <input
                  id="department"
                  type="text"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={selectedUser.Department || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, Department: e.target.value})}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="position">
                  Position
                </label>
                <input
                  id="position"
                  type="text"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={selectedUser.Position || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, Position: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={handleUpdateRole}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-auto">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default ManageUsers;
