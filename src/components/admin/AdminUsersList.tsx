import React, { useState, useEffect } from 'react';
import cognitoAdminService from '../../services/cognitoAdminService';
// Import toast directly
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface User {
  userId: string;
  username: string;
  email: string;
  status: string;
  role: string;
  enabled: boolean;
}

interface AdminUsersListProps {
  onRefresh?: () => Promise<void>;
}

const AdminUsersList: React.FC<AdminUsersListProps> = ({ onRefresh }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await cognitoAdminService.getAllUsers();
      
      // Check if response has users array
      if (response && response.users) {
        // Map the response to match our User interface (specifically for Cognito)
        const formattedUsers = response.users.map((user: any) => ({
          userId: user.userId || user.Username || user.sub,
          username: user.username || user.Username || user.email || 'Unknown',
          email: user.email || user.Email || 'No email',
          status: user.status || user.Status || 'Unknown',
          role: user.role || user.UserRole || user.custom_role || user.attributes?.['custom:role'] || 'User',
          enabled: user.enabled === undefined ? (user.Enabled === undefined ? true : user.Enabled) : user.enabled
        }));
        
        setUsers(formattedUsers);
      } else {
        setError('Invalid response format from API');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccess = async (userId: string, currentStatus: boolean) => {
    try {
      setIsProcessing(prev => ({ ...prev, [userId]: true }));
      
      // Call the API to toggle access
      await cognitoAdminService.toggleUserAccess(userId, currentStatus);
      
      // Update the local state
      setUsers(users.map(user => 
        user.userId === userId 
          ? { ...user, enabled: currentStatus, status: currentStatus ? 'ACTIVE' : 'INACTIVE' } 
          : user
      ));
      
      // Show notification
      toast.success(`User ${currentStatus ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      toast.error(`Failed to ${currentStatus ? 'enable' : 'disable'} user`);
    } finally {
      setIsProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Render loading, error, or the users table
  if (loading) {
    return <div className="text-center"><div className="spinner-border" role="status"></div></div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div>
      <ToastContainer position="top-right" autoClose={3000} />
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center">No users found</td>
            </tr>
          ) : (
            users.map(user => (
              <tr key={user.userId}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span className={`badge bg-${user.enabled ? 'success' : 'danger'}`}>
                    {user.enabled ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button 
                    className={`btn btn-sm ${user.enabled ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => handleToggleAccess(user.userId, !user.enabled)}
                    disabled={isProcessing[user.userId]}
                  >
                    {isProcessing[user.userId] ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      user.enabled ? 'Disable' : 'Enable'
                    )}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUsersList;
