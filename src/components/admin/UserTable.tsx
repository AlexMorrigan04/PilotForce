import React from 'react';
import { FiEdit, FiTrash2, FiEye, FiToggleLeft, FiToggleRight, FiMail, FiUser } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

interface User {
  // Support both original field naming and Cognito naming for flexibility
  id?: string;
  UserId?: string;
  username?: string;
  Username?: string;
  email?: string;
  Email?: string;
  name?: string;
  Name?: string;
  company?: string;
  companyId?: string;
  CompanyId?: string;
  role?: string;
  UserRole?: string;
  status?: string;
  Status?: string;
  lastLogin?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  isEnabled?: boolean;
  Enabled?: boolean;
  AuthMethod?: string;
}

interface UserTableProps {
  users: User[];
  loading: boolean;
  onEdit: (userId: string) => void;
  onDelete: (userId: string) => void;
  onToggleAccess: (userId: string, isEnabled: boolean) => void;
  onViewDetails: (userId: string) => void;
  selectedUsers: string[];
  onSelectUser: (userId: string) => void;
  onSelectAll: () => void;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  loading,
  onEdit,
  onDelete,
  onToggleAccess,
  onViewDetails,
  selectedUsers,
  onSelectUser,
  onSelectAll
}) => {
  // Format date strings for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return dateString;
    }
  };

  // Get status badge style based on status
  const getStatusBadgeStyle = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusLower = status.toLowerCase();
    if (statusLower === 'confirmed') return 'bg-green-100 text-green-800';
    if (statusLower === 'enabled') return 'bg-green-100 text-green-800';
    if (statusLower === 'disabled') return 'bg-red-100 text-red-800';
    if (statusLower === 'unconfirmed') return 'bg-yellow-100 text-yellow-800';
    if (statusLower === 'force_change_password') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Get role badge style based on role
  const getRoleBadgeStyle = (role: string) => {
    if (!role) return 'bg-gray-100 text-gray-800';
    
    const roleLower = role.toLowerCase();
    if (roleLower.includes('admin')) return 'bg-purple-100 text-purple-800';
    if (roleLower.includes('manager')) return 'bg-blue-100 text-blue-800';
    return 'bg-indigo-100 text-indigo-800';
  };

  // Get auth method icon
  const getAuthMethodIcon = (user: User) => {
    const authMethod = user.AuthMethod?.toLowerCase() || '';
    
    if (authMethod === 'google' || (user.Username && user.Username.startsWith('Google_'))) {
      return <FcGoogle className="h-5 w-5 inline-block" title="Google OAuth" />;
    }
    
    return <FiMail className="h-5 w-5 inline-block" title="Email/Password" />;
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No users found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  checked={selectedUsers.length > 0 && selectedUsers.length === users.length}
                  onChange={onSelectAll}
                />
              </div>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Company
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created At
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Enabled
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => {
            // Get correct field values supporting both naming conventions
            const userId = user.UserId || user.id || '';
            const username = user.Username || user.username || '';
            const email = user.Email || user.email || '';
            const companyId = user.CompanyId || user.companyId || '';
            const role = user.UserRole || user.role || 'User';
            const status = user.Status || user.status || '';
            const isEnabled = user.Enabled !== undefined ? user.Enabled : (user.isEnabled || false);
            const createdAt = user.CreatedAt || user.lastLogin || '';
            
            return (
              <tr key={userId} className="hover:bg-gray-50">
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={selectedUsers.includes(userId)}
                      onChange={() => onSelectUser(userId)}
                    />
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="mr-2">
                      {getAuthMethodIcon(user)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.Name || user.name || username}</div>
                      <div className="text-xs text-gray-500">ID: {userId.substring(0, 8)}...</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{email || 'N/A'}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{companyId || 'N/A'}</div>
                  {user.company && (
                    <div className="text-xs text-gray-500">{user.company}</div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeStyle(role)}`}>
                    {role}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(status)}`}>
                    {status || 'Unknown'}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(createdAt)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {isEnabled ? (
                    <span className="text-green-500 font-medium">Yes</span>
                  ) : (
                    <span className="text-red-500 font-medium">No</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onViewDetails(userId)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View details"
                    >
                      <FiEye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onEdit(userId)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit user"
                    >
                      <FiEdit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onToggleAccess(userId, !isEnabled)}
                      className={isEnabled ? "text-orange-600 hover:text-orange-900" : "text-green-600 hover:text-green-900"}
                      title={isEnabled ? "Disable user" : "Enable user"}
                    >
                      {isEnabled ? (
                        <FiToggleRight className="h-5 w-5" />
                      ) : (
                        <FiToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => onDelete(userId)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete user"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
