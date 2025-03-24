import React, { useState, useEffect } from 'react';
import AWS from 'aws-sdk';
import { FaTrash, FaEdit, FaUserPlus, FaSpinner, FaUserClock } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import PendingUserRequests from './PendingUserRequests';

interface CompanyUser {
  id: string;
  username: string; // Changed from name to username
  email: string;
  phoneNumber?: string; // Add phone number to the CompanyUser interface
  role: string;
  status: string;
  dateJoined: string;
}

interface CompanyUsersProps {
  className?: string;
}

const CompanyUsers: React.FC<CompanyUsersProps> = ({ className }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', role: '', phoneNumber: '' });
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  // AWS configuration
  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

  const dynamoDb = new AWS.DynamoDB.DocumentClient({ 
    region: awsRegion,
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  });

  useEffect(() => {
    // Check if the current user is an admin
    if (user?.role === 'AccountAdmin' || user?.role === 'Admin') {
      setIsAdmin(true);
    }
    
    fetchCompanyUsers();
  }, [user?.companyId]);

  const fetchCompanyUsers = async () => {
    if (!user?.companyId) {
      setError('Cannot fetch users: No company ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Query the Users table by CompanyId and UserAccess=true (only active users)
      const params = {
        TableName: 'Users',
        FilterExpression: 'CompanyId = :companyId AND UserAccess = :userAccess',
        ExpressionAttributeValues: {
          ':companyId': user.companyId,
          ':userAccess': true // Only get active/approved users
        }
      };

      const response = await dynamoDb.scan(params).promise();
      
      if (response.Items) {
        const companyUsers = response.Items.map(item => ({
          id: item.UserId || item.id,
          username: item.Username || item.username || 'N/A', // Get Username field
          email: item.Email || item.email || 'N/A',
          phoneNumber: item.PhoneNumber || item.phoneNumber || 'N/A',
          role: item.UserRole || item.Role || item.role || 'User', // Also check UserRole field
          status: item.UserAccess ? 'Active' : 'Pending', // Convert UserAccess boolean to status string
          dateJoined: item.CreatedAt || item.DateJoined || item.createdAt || 'N/A'
        }));
        
        setUsers(companyUsers);
      } else {
        setUsers([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching company users:', err);
      setError('Failed to load company users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle pending requests count update
  const handlePendingRequestsCountChange = (count: number) => {
    setPendingRequestsCount(count);
  };

  const handleEditClick = (user: CompanyUser) => {
    setEditingUser(user);
    setEditFormData({
      name: user.username, // Use username instead of name
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber || ''
    });
    setIsEditing(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser || !user?.companyId) return;
    
    try {
      const params = {
        TableName: 'Users',
        Key: {
          UserId: editingUser.id
        },
        UpdateExpression: 'set Username = :username, Email = :email, UserRole = :role, PhoneNumber = :phoneNumber',
        ExpressionAttributeValues: {
          ':username': editFormData.name, // Send as Username
          ':email': editFormData.email,
          ':role': editFormData.role,
          ':phoneNumber': editFormData.phoneNumber
        },
        ReturnValues: 'UPDATED_NEW'
      };
      
      await dynamoDb.update(params).promise();
      
      // Update the user in the local state
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, username: editFormData.name, email: editFormData.email, role: editFormData.role, phoneNumber: editFormData.phoneNumber }
          : u
      ));
      
      // Close the edit form
      setIsEditing(false);
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!user?.companyId) return;
    
    // Check if user is trying to delete themselves
    if (user.id === userId) {
      setError("You cannot delete your own account from this interface.");
      return;
    }
    
    // Set the user ID as being deleted
    setIsDeleting(userId);
    
    try {
      const params = {
        TableName: 'Users',
        Key: {
          UserId: userId
        }
      };
      
      await dynamoDb.delete(params).promise();
      
      // Remove the user from the local state
      setUsers(users.filter(u => u.id !== userId));
      setError(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white shadow-sm rounded-lg p-6 ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Company Users</h2>
        </div>
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow-sm rounded-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Company Users</h2>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Tabs for active/pending users */}
      {isAdmin && (
        <div className="border-b border-gray-200 mb-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-2 px-1 font-medium text-sm relative ${activeTab === 'active' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Active Users
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 font-medium text-sm relative ${activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Pending Requests
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full px-1.5">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'active' ? (
        <>
          {isEditing && editingUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <h3 className="text-lg font-medium text-blue-800 mb-3">Edit User</h3>
              <form onSubmit={handleEditFormSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={editFormData.phoneNumber || ''}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      name="role"
                      value={editFormData.role}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="User">User</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingUser(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <div className="overflow-hidden rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length > 0 ? (
                  users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phoneNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'Admin' || user.role === 'AccountAdmin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'Active' ? 'bg-green-100 text-green-800' :
                          user.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.dateJoined)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                          title="Edit user"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete user"
                          disabled={isDeleting === user.id}
                        >
                          {isDeleting === user.id ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaTrash />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                      No users found in your company. Invite users to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <PendingUserRequests onRequestsCountChange={handlePendingRequestsCountChange} />
      )}
    </div>
  );
};

export default CompanyUsers;
