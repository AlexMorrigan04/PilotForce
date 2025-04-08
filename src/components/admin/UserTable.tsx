import React, { useState } from 'react';
import { FiEdit, FiTrash2, FiLock, FiUnlock, FiExternalLink, FiChevronUp, FiChevronDown } from 'react-icons/fi';

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

type SortField = 'username' | 'email' | 'company' | 'role' | 'status' | 'lastLogin';
type SortDirection = 'asc' | 'desc';

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
  const [sortField, setSortField] = useState<SortField>('username');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === bValue) return 0;
    
    // Special handling for dates
    if (sortField === 'lastLogin') {
      // Special handling for 'Never' in lastLogin
      if (aValue === 'Never') return sortDirection === 'asc' ? 1 : -1;
      if (bValue === 'Never') return sortDirection === 'asc' ? -1 : 1;
      
      if (aValue !== 'Never' && bValue !== 'Never') {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        const result = aDate < bDate ? -1 : 1;
        return sortDirection === 'asc' ? result : -result;
      }
    }
    
    const result = aValue < bValue ? -1 : 1;
    return sortDirection === 'asc' ? result : -result;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <FiChevronUp className="inline ml-1" /> : <FiChevronDown className="inline ml-1" />;
  };

  const renderSortableHeader = (field: SortField, label: string) => (
    <th 
      scope="col" 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
      onClick={() => handleSort(field)}
    >
      {label} {getSortIcon(field)}
    </th>
  );

  const getStatusBadgeClass = (status: string, isEnabled: boolean) => {
    if (!isEnabled) return 'bg-red-100 text-red-800 border-red-200';
    
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={onSelectAll}
                />
                <span className="sr-only">Select All</span>
              </div>
            </th>
            {renderSortableHeader('username', 'User')}
            {renderSortableHeader('company', 'Company')}
            {renderSortableHeader('role', 'Role')}
            {renderSortableHeader('status', 'Status')}
            {renderSortableHeader('lastLogin', 'Last Login')}
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                <div className="flex justify-center items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                  <span>Loading users...</span>
                </div>
              </td>
            </tr>
          ) : sortedUsers.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                No users found
              </td>
            </tr>
          ) : (
            sortedUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => onSelectUser(user.id)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.company}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.role === 'Admin' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Admin
                    </span>
                  ) : (
                    user.role
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(user.status, user.isEnabled)}`}>
                    {!user.isEnabled ? 'Disabled' : user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLogin}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onViewDetails(user.id)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    title="View User Details"
                  >
                    <FiExternalLink />
                  </button>
                  <button
                    onClick={() => onEdit(user.id)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    title="Edit User"
                  >
                    <FiEdit />
                  </button>
                  {user.isEnabled ? (
                    <button 
                      onClick={() => onToggleAccess(user.id, false)}
                      className="text-blue-600 hover:text-blue-900 mr-3" 
                      title="Disable User"
                    >
                      <FiLock />
                    </button>
                  ) : (
                    <button 
                      onClick={() => onToggleAccess(user.id, true)}
                      className="text-blue-600 hover:text-blue-900 mr-3" 
                      title="Enable User"
                    >
                      <FiUnlock />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(user.id)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Delete User"
                  >
                    <FiTrash2 />
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

export default UserTable;
